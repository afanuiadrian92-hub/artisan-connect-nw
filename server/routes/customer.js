// ─── customer.js ─────────────────────────────────────────────────────────────
// Save this file as: server/routes/customer.js

const express = require('express')
const router  = express.Router()
const pool    = require('../db/pool')
const { verifyToken, requireRole } = require('../middleware/auth')

// ── Inline controllers (keeps file count manageable) ─────────────────────────
// Save server/controllers/customerController.js separately (provided above)
const {
  getCustomerDashboard,
  createJobPost, getMyJobPosts,
  getQuotesForJob, acceptQuote,
  getMyBookings, cancelBooking,
  submitReview,
  getNotifications, markNotificationsRead,
} = require('../controllers/customerController')

router.use(verifyToken)

// Shared across all roles — only needs valid token
router.get  ('/notifications',       getNotifications)
router.patch('/notifications/read',  markNotificationsRead)

// Customer-only below
router.use(requireRole('customer'))

router.get  ('/dashboard',                       getCustomerDashboard)
router.post ('/jobs',                            createJobPost)
router.get  ('/jobs',                            getMyJobPosts)
router.get  ('/jobs/:id/quotes',                 getQuotesForJob)
router.post ('/jobs/:id/quotes/:quoteId/accept', acceptQuote)
router.get  ('/bookings',                        getMyBookings)
router.post ('/bookings/:id/cancel',             cancelBooking)
router.post ('/reviews',                         submitReview)

module.exports = router