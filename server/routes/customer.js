const express = require('express')
const router  = express.Router()
const {
  getCustomerDashboard,
  createJobPost, getMyJobPosts,
  getQuotesForJob, acceptQuote,
  getMyBookings, cancelBooking,
  submitReview,
  getNotifications, markNotificationsRead,
} = require('../controllers/customerController')
const { verifyToken, requireRole } = require('../middleware/auth')

// All customer routes require authentication
// Notifications are shared across roles so verifyToken only (no requireRole)
router.use(verifyToken)

// ── Shared across roles (notifications) ──────────────────────────────────────
router.get  ('/notifications',      getNotifications)
router.patch('/notifications/read', markNotificationsRead)

// ── Customer-only routes ──────────────────────────────────────────────────────
router.use(requireRole('customer'))

router.get  ('/dashboard',                        getCustomerDashboard)
router.post ('/jobs',                             createJobPost)
router.get  ('/jobs',                             getMyJobPosts)
router.get  ('/jobs/:id/quotes',                  getQuotesForJob)
router.post ('/jobs/:id/quotes/:quoteId/accept',  acceptQuote)
router.get  ('/bookings',                         getMyBookings)
router.post ('/bookings/:id/cancel',              cancelBooking)
router.post ('/reviews',                          submitReview)

module.exports = router