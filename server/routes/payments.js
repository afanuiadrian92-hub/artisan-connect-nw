// Save as: server/routes/payments.js

const express = require('express')
const router  = express.Router()
const {
  initiatePayment,
  checkPaymentStatus,
  handleWebhook,
  getPaymentHistory,
} = require('../controllers/paymentController')
const { verifyToken, requireRole } = require('../middleware/auth')

// ── Webhook — public, no auth ─────────────────────────────────────────────────
// Monetbil calls this endpoint directly — no JWT involved
// Must be registered first before protected routes
router.post('/webhook', handleWebhook)

// ── Authenticated customer routes ─────────────────────────────────────────────
router.use(verifyToken, requireRole('customer'))

router.post('/initiate',            initiatePayment)
router.get ('/status/:bookingId',   checkPaymentStatus)
router.get ('/history',             getPaymentHistory)

module.exports = router