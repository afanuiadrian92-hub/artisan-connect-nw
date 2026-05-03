// server/controllers/paymentController.js
// CamPay Integration — supports MTN MoMo and Orange Money in Cameroon
// Demo sandbox: https://demo.campay.net/api/
// Production:   https://campay.net/api/

const pool  = require('../db/pool')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

const CAMPAY_BASE_URL = process.env.CAMPAY_BASE_URL || 'https://demo.campay.net/api/'

// ── Helper: get CamPay access token ──────────────────────────────────────────
// CamPay uses username/password to get a temporary bearer token.
// Tokens expire — in production you would cache this for ~50 minutes.
// For the thesis demo, we fetch fresh on each request (simpler, fine for low volume).
const getCamPayToken = async () => {
  const response = await axios.post(
    `${CAMPAY_BASE_URL}token/`,
    {
      username: process.env.CAMPAY_USERNAME,
      password: process.env.CAMPAY_PASSWORD,
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
  // Returns { token: "ey..." }
  return response.data.token
}

// ── POST /api/payments/initiate ───────────────────────────────────────────────
// Customer initiates payment for a confirmed booking via CamPay.
// CamPay sends a USSD prompt to the phone for MTN or Orange Money.
// Works for both networks — CamPay detects operator from the phone number.
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, payerPhone } = req.body

    if (!bookingId || !payerPhone) {
      return res.status(400).json({
        error: 'Booking ID and payer phone number are required.'
      })
    }

    // Confirm booking belongs to this customer
    const bookingResult = await pool.query(
      `SELECT b.*, p.id AS payment_id, p.status AS payment_status
       FROM bookings b
       JOIN payments p ON p.booking_id = b.id
       WHERE b.id = $1 AND b.customer_id = $2`,
      [bookingId, req.user.id]
    )

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' })
    }

    const booking = bookingResult.rows[0]

    if (booking.payment_status === 'completed') {
      return res.status(400).json({ error: 'This booking has already been paid.' })
    }

    // Generate external reference — links CamPay transaction back to our DB
    const externalReference = `TRUSTLINK-${bookingId}-${uuidv4().split('-')[0].toUpperCase()}`

    // Phone must include country code: 237XXXXXXXXX (no + prefix)
    const formattedPhone = payerPhone.replace(/^\+/, '').replace(/^00/, '')

    // Get CamPay auth token
    const token = await getCamPayToken()

    // Initiate collection — CamPay sends USSD prompt to phone
    // Determine amount to send to CamPay
    // In test mode: send 5 XAF (well under the 25 XAF sandbox limit)
    // In production: send the real booking amount
    const campayAmount = process.env.PAYMENT_MODE === 'test'
      ? '5'
      : booking.total_amount.toString()

    const campayResponse = await axios.post(
      `${CAMPAY_BASE_URL}collect/`,
      {
        amount:             campayAmount,   // ← changed from booking.total_amount
        currency:           'XAF',
        from:               formattedPhone,
        description:        `TrustLink payment for booking #${bookingId}`,
        external_reference: externalReference,
      },
      {
        headers: {
          Authorization:  `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // CamPay response includes: reference, ussd_code, operator (mtn/orange)
    const { reference, ussd_code, operator } = campayResponse.data

    // Store CamPay reference and payer phone in our payments record
    // payer_phone creates the identity-payment audit trail for trust/anti-fraud
    await pool.query(
      `UPDATE payments
       SET status = 'pending',
           momo_transaction_id = $1,
           payer_phone = $2,
           external_reference = $3
       WHERE booking_id = $4`,
      [reference, formattedPhone, externalReference, bookingId]
    )

    // Move to escrow state — funds requested but not yet confirmed
    await pool.query(
      `UPDATE bookings SET payment_state = 'escrowed' WHERE id = $1`,
      [bookingId]
    )

    res.status(200).json({
      message:    `Payment request sent. ${ussd_code ? 'Dial: ' + ussd_code : 'Approve on your phone.'}`,
      reference,
      operator:   operator || 'mtn/orange',
      ussdCode:   ussd_code || null,
      amount:     booking.total_amount,
      currency:   'XAF',
      externalReference,
    })

  } catch (err) {
    if (err.response) {
      console.error('CamPay error:', err.response.data)
      return res.status(502).json({
        error:   'Payment gateway error.',
        details: err.response.data,
      })
    }
    next(err)
  }
}

// ── GET /api/payments/status/:bookingId ───────────────────────────────────────
// Poll CamPay for the current status of a payment.
// Frontend calls this after initiating — every 5 seconds until SUCCESSFUL or FAILED.
const checkPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params

    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE booking_id = $1`,
      [bookingId]
    )

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found.' })
    }

    const payment = paymentResult.rows[0]

    if (!payment.momo_transaction_id) {
      return res.status(200).json({ status: 'not_initiated', payment })
    }

    // If already confirmed in our DB, return immediately — no need to call CamPay again
    if (payment.status === 'completed') {
      return res.status(200).json({ status: 'completed', payment })
    }
    if (payment.status === 'failed') {
      return res.status(200).json({ status: 'failed', payment })
    }

    // Poll CamPay for current status
    const token = await getCamPayToken()

    const campayResponse = await axios.get(
      `${CAMPAY_BASE_URL}transaction/${payment.momo_transaction_id}/`,
      {
        headers: {
          Authorization:  `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // CamPay returns: status (SUCCESSFUL/FAILED/PENDING), operator, amount, currency, code
    const {
      status: campayStatus,
      operator,
      code: campayCode,
      operator_reference,
    } = campayResponse.data

    // Map CamPay status to our internal values
    const statusMap = {
      SUCCESSFUL: 'completed',
      FAILED:     'failed',
      PENDING:    'pending',
    }
    const internalStatus = statusMap[campayStatus] || 'pending'

    // Payment succeeded — release escrow, move booking to in-progress
    if (internalStatus === 'completed' && payment.status !== 'completed') {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        // Update payment with CamPay transaction code (their internal reference)
        await client.query(
          `UPDATE payments
           SET status = 'completed',
               financial_transaction_id = $1,
               campay_code = $2
           WHERE booking_id = $3`,
          [operator_reference || campayCode, campayCode, bookingId]
        )

        // Release escrow — booking moves to in-progress
        await client.query(
          `UPDATE bookings
           SET status = 'in-progress', payment_state = 'released'
           WHERE id = $1`,
          [bookingId]
        )

        // Get parties for notifications
        const bookingData = await client.query(
          `SELECT b.customer_id, ap.user_id AS artisan_user_id, b.total_amount
           FROM bookings b
           JOIN artisan_profiles ap ON b.artisan_id = ap.id
           WHERE b.id = $1`,
          [bookingId]
        )

        const b = bookingData.rows[0]
        const operatorLabel = operator ? operator.toUpperCase() : 'Mobile Money'

        await client.query(
          `INSERT INTO notifications (user_id, type, message) VALUES
           ($1, 'payment', $3),
           ($2, 'payment', $4)`,
          [
            b.customer_id,
            b.artisan_user_id,
            `Payment of XAF ${parseInt(b.total_amount).toLocaleString()} confirmed via ${operatorLabel}. Your booking is now in progress.`,
            `Payment received for booking #${bookingId}. You may begin the job.`,
          ]
        )

        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }

    // Payment failed — revert payment state so customer can retry
    if (internalStatus === 'failed' && payment.status !== 'failed') {
      await pool.query(
        `UPDATE payments SET status = 'failed' WHERE booking_id = $1`, [bookingId]
      )
      await pool.query(
        `UPDATE bookings SET payment_state = 'pending' WHERE id = $1`, [bookingId]
      )
    }

    res.status(200).json({
      status:            internalStatus,
      campayStatus,
      operator:          operator || null,
      amount:            payment.amount,
      currency:          payment.currency,
      payerPhone:        payment.payer_phone,
      campayReference:   payment.momo_transaction_id,
      externalReference: payment.external_reference,
    })

  } catch (err) {
    if (err.response) {
      return res.status(502).json({
        error:   'Could not retrieve payment status from CamPay.',
        details: err.response.data,
      })
    }
    next(err)
  }
}

// ── GET /api/payments/history ─────────────────────────────────────────────────
// Customer views their full payment history
const getPaymentHistory = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id, p.amount, p.currency, p.status,
         p.momo_transaction_id AS campay_reference,
         p.payer_phone, p.external_reference, p.created_at,
         b.id AS booking_id, b.scheduled_date,
         jp.title AS service_title,
         au.full_name AS artisan_name
       FROM payments p
       JOIN bookings b    ON p.booking_id = b.id
       JOIN job_posts jp  ON b.job_id = jp.id
       JOIN artisan_profiles ap ON b.artisan_id = ap.id
       JOIN users au      ON ap.user_id = au.id
       WHERE b.customer_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    )
    res.status(200).json({ payments: result.rows })
  } catch (err) {
    next(err)
  }
}

module.exports = { initiatePayment, checkPaymentStatus, getPaymentHistory }