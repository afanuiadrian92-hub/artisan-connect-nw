const express    = require('express')
const router     = express.Router()
const { register, login, getMe } = require('../controllers/authController')
const { verifyToken } = require('../middleware/auth')

// Public routes — no token needed
router.post('/register', register)
router.post('/login',    login)

// Protected — requires valid JWT
// Used by the frontend on app load to restore user session
router.get('/me', verifyToken, getMe)

module.exports = router