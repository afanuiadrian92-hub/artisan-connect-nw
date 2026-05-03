// server/routes/payments.js
const express = require('express')
const router  = express.Router()
const {
  initiatePayment,
  checkPaymentStatus,
  getPaymentHistory,
} = require('../controllers/paymentController')
const { verifyToken, requireRole } = require('../middleware/auth')

router.use(verifyToken)

// All payment routes are customer-only
router.post('/initiate',           requireRole('customer'), initiatePayment)
router.get ('/status/:bookingId',  requireRole('customer'), checkPaymentStatus)
router.get ('/history',            requireRole('customer'), getPaymentHistory)

module.exports = router