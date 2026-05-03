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

// ── POST /api/auth/seed-admin ─────────────────────────────────────────────────
// Creates the first admin account. Protected by a secret seed key in .env.
// This route should be disabled or removed after first admin is created.
router.post('/seed-admin', async (req, res, next) => {
  const { fullName, email, password, seedKey } = req.body

  // Guard — only works if the caller knows the seed key
  if (seedKey !== process.env.ADMIN_SEED_KEY) {
    return res.status(403).json({ error: 'Invalid seed key.' })
  }

  try {
    const bcrypt = require('bcryptjs')
    const jwt    = require('jsonwebtoken')
    const pool   = require('../db/pool')

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email.toLowerCase()]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' })
    }

    const passwordHash    = await bcrypt.hash(password, 12)
    const avatarInitials  = (fullName.trim().split(' ')
      .map(p => p[0]).join('')).toUpperCase().slice(0, 2)

    const result = await pool.query(
      `INSERT INTO users
         (full_name, email, password_hash, role, avatar_initials)
       VALUES ($1, $2, $3, 'admin', $4)
       RETURNING id, full_name, email, role, avatar_initials`,
      [fullName.trim(), email.toLowerCase(), passwordHash, avatarInitials]
    )

    const user  = result.rows[0]
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Log the admin creation
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id)
       VALUES ($1, 'Admin account seeded', 'user', $1)`,
      [user.id]
    )

    res.status(201).json({
      message: 'Admin account created successfully.',
      token,
      user: {
        id:             user.id,
        fullName:       user.full_name,
        email:          user.email,
        role:           user.role,
        avatarInitials: user.avatar_initials,
      },
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router