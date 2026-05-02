const pool  = require('../db/pool')
const axios = require('axios')
require('dotenv').config()

const CAMPAY_BASE = process.env.CAMPAY_ENV === 'prod'
  ? 'https://campay.net/api'
  : 'https://demo.campay.net/api'

const getCamPayToken = async () => {
  const response = await axios.post(`${CAMPAY_BASE}/token/`, {
    username: process.env.CAMPAY_APP_USERNAME,
    password: process.env.CAMPAY_APP_PASSWORD,
  }, { headers: { 'Content-Type': 'application/json' } })
  return response.data.token
}

// ── POST /api/payments/initiate ───────────────────────────────────────────────
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, payerPhone, description } = req.body

    if (!bookingId || !payerPhone) {
      return res.status(400).json({ error: 'Booking ID and payer phone are required.' })
    }

    const bookingResult = await pool.query(
      `SELECT b.*, p.id AS payment_id, p.status AS payment_status
       FROM bookings b JOIN payments p ON p.booking_id = b.id
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

    const externalRef    = `TRUSTLINK-${bookingId}-${Date.now()}`
    const rawPhone       = payerPhone.replace(/^\+/, '').replace(/^237/, '')
    const formattedPhone = `237${rawPhone}`

    const token = await getCamPayToken()

    const campayResponse = await axios.post(`${CAMPAY_BASE}/collect/`, {
      amount:             booking.total_amount.toString(),
      currency:           'XAF',
      from:               formattedPhone,
      description:        description || `TrustLink payment for booking #${bookingId}`,
      external_reference: externalRef,
    }, {
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    })

    const { reference, ussd_code, operator } = campayResponse.data

    await pool.query(
      `UPDATE payments SET status='pending', momo_transaction_id=$1, payer_phone=$2
       WHERE booking_id=$3`,
      [reference, formattedPhone, bookingId]
    )

    await pool.query(
      `UPDATE bookings SET payment_state='escrowed' WHERE id=$1`, [bookingId]
    )

    res.status(200).json({
      message:  `Payment request sent. Use ${ussd_code} to confirm on your phone.`,
      reference, ussdCode: ussd_code,
      operator: operator || 'MTN or Orange',
      amount:   booking.total_amount, currency: 'XAF',
    })
  } catch (err) {
    if (err.response) {
      console.error('CamPay error:', err.response.data)
      return res.status(502).json({ error: 'Payment gateway error.', details: err.response.data })
    }
    next(err)
  }
}

// ── GET /api/payments/status/:bookingId ───────────────────────────────────────
const checkPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params

    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE booking_id=$1`, [bookingId]
    )
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found.' })
    }

    const payment = paymentResult.rows[0]

    if (!payment.momo_transaction_id) {
      return res.status(200).json({ status: 'not_initiated', payment })
    }

    if (['completed','failed'].includes(payment.status)) {
      return res.status(200).json({
        status: payment.status, amount: payment.amount,
        currency: payment.currency, payerPhone: payment.payer_phone,
        reference: payment.momo_transaction_id,
      })
    }

    const token = await getCamPayToken()

    const campayResponse = await axios.get(
      `${CAMPAY_BASE}/transaction/?reference=${payment.momo_transaction_id}`,
      { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } }
    )

    const campayStatus = campayResponse.data.status
    const statusMap    = { SUCCESSFUL: 'completed', FAILED: 'failed', PENDING: 'pending' }
    const internalStatus = statusMap[campayStatus] || 'pending'

    if (internalStatus === 'completed' && payment.status !== 'completed') {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        await client.query(
          `UPDATE payments SET status='completed', financial_transaction_id=$1
           WHERE booking_id=$2`,
          [campayResponse.data.operator_reference || payment.momo_transaction_id, bookingId]
        )
        await client.query(
          `UPDATE bookings SET status='in-progress', payment_state='released' WHERE id=$1`,
          [bookingId]
        )

        const meta = await client.query(
          `SELECT b.customer_id, ap.user_id AS artisan_user_id, b.total_amount
           FROM bookings b JOIN artisan_profiles ap ON b.artisan_id=ap.id WHERE b.id=$1`,
          [bookingId]
        )
        const b = meta.rows[0]

        await client.query(
          `INSERT INTO notifications (user_id, type, message) VALUES ($1,'payment',$2),($3,'payment',$4)`,
          [
            b.customer_id,
            `Payment of XAF ${parseInt(b.total_amount).toLocaleString()} confirmed. Booking in progress.`,
            b.artisan_user_id,
            `Payment received for booking #${bookingId}. You may begin the job.`,
          ]
        )

        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK'); throw err
      } finally {
        client.release()
      }
    }

    if (internalStatus === 'failed' && payment.status !== 'failed') {
      await pool.query(`UPDATE payments SET status='failed' WHERE booking_id=$1`, [bookingId])
      await pool.query(`UPDATE bookings SET payment_state='pending' WHERE id=$1`, [bookingId])
    }

    res.status(200).json({
      status: internalStatus, campayStatus,
      amount: payment.amount, currency: payment.currency,
      payerPhone: payment.payer_phone,
      reference: payment.momo_transaction_id,
      operator: campayResponse.data.operator || null,
    })
  } catch (err) {
    if (err.response) {
      return res.status(502).json({ error: 'Could not retrieve payment status.', details: err.response.data })
    }
    next(err)
  }
}

// ── GET /api/payments/history ─────────────────────────────────────────────────
const getPaymentHistory = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.status,
              p.momo_transaction_id AS campay_reference,
              p.payer_phone, p.created_at,
              b.id AS booking_id, b.scheduled_date,
              jp.title AS service_title, au.full_name AS artisan_name
       FROM payments p
       JOIN bookings b   ON p.booking_id=b.id
       JOIN job_posts jp ON b.job_id=jp.id
       JOIN artisan_profiles ap ON b.artisan_id=ap.id
       JOIN users au ON ap.user_id=au.id
       WHERE b.customer_id=$1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    )
    res.status(200).json({ payments: result.rows })
  } catch (err) { next(err) }
}

module.exports = { initiatePayment, checkPaymentStatus, getPaymentHistory }