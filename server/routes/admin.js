const express = require('express')
const router  = express.Router()
const {
  getAdminDashboard, getVerificationQueue, reviewDocument,
  getUsers, suspendUser, getAllBookings, completeBooking,
} = require('../controllers/adminController')
const { verifyToken, requireRole } = require('../middleware/auth')

// All admin routes require authentication AND admin role
router.use(verifyToken, requireRole('admin'))

router.get  ('/dashboard',                  getAdminDashboard)
router.get  ('/verification',               getVerificationQueue)
router.patch('/verification/:docId',        reviewDocument)
router.get  ('/users',                      getUsers)
router.patch('/users/:id/suspend',          suspendUser)
router.get  ('/bookings',                   getAllBookings)
router.patch('/bookings/:id/complete',      completeBooking)

module.exports = router