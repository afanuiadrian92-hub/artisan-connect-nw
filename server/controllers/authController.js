const pool   = require('../db/pool')
const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { getDivisionByQuarter } = require('../utils/nwRegion')

// ── Helper: generate JWT ─────────────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    {
      id:       user.id,
      email:    user.email,
      role:     user.role,
      fullName: user.full_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// ── Helper: get initials from full name ──────────────────────────────────────
const getInitials = (name) => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { fullName, email, phone, quarter, password, role } = req.body

    // ── Validation ────────────────────────────────────────────────────────────
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, email, password and role are required.' })
    }
    if (!['customer', 'artisan'].includes(role)) {
      return res.status(400).json({ error: 'Role must be customer or artisan.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    // ── Check email not already registered ───────────────────────────────────
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    // Cost factor 12 — strong enough for production, fast enough for development
    const passwordHash = await bcrypt.hash(password, 12)

    // ── Derive division from quarter ──────────────────────────────────────────
    // Stored silently — users never see division, only quarter
    const division = getDivisionByQuarter(quarter) || null

    // ── Insert user ───────────────────────────────────────────────────────────
    const userResult = await pool.query(
      `INSERT INTO users
         (full_name, email, password_hash, role, phone, quarter, division, avatar_initials)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, full_name, email, role, phone, quarter, division, avatar_initials, created_at`,
      [
        fullName.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        role,
        phone || null,
        quarter || null,
        division,
        getInitials(fullName),
      ]
    )

    const user = userResult.rows[0]

    // ── If artisan: create artisan_profile record ─────────────────────────────
    // Every artisan needs a profile row — customers do not
    if (role === 'artisan') {
      await pool.query(
        `INSERT INTO artisan_profiles (user_id, availability_status, trust_score)
         VALUES ($1, 'available', 0)`,
        [user.id]
      )
    }

    // ── Generate token and respond ────────────────────────────────────────────
    const token = generateToken(user)

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id:             user.id,
        fullName:       user.full_name,
        email:          user.email,
        role:           user.role,
        phone:          user.phone,
        quarter:        user.quarter,
        division:       user.division,
        avatarInitials: user.avatar_initials,
      },
    })

  } catch (err) {
    next(err) // passes to central error handler
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body

    // ── Validation ────────────────────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    // ── Find user ─────────────────────────────────────────────────────────────
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role,
              phone, quarter, division, avatar_initials
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    )

    if (result.rows.length === 0) {
      // Deliberately vague — don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const user = result.rows[0]

    // ── Role check ────────────────────────────────────────────────────────────
    // If the user selected the wrong tab on the login form, catch it here
    if (role && user.role !== role) {
      return res.status(401).json({
        error: `This account is registered as a ${user.role}, not a ${role}.`
      })
    }

    // ── Verify password ───────────────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // ── If artisan: fetch artisan profile id and trust score ──────────────────
    let artisanProfile = null
    if (user.role === 'artisan') {
      const profileResult = await pool.query(
        `SELECT id, trust_score, avg_rating, availability_status
         FROM artisan_profiles WHERE user_id = $1`,
        [user.id]
      )
      if (profileResult.rows.length > 0) {
        artisanProfile = profileResult.rows[0]
      }
    }

    // ── Generate token ────────────────────────────────────────────────────────
    const token = generateToken(user)

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id:             user.id,
        fullName:       user.full_name,
        email:          user.email,
        role:           user.role,
        phone:          user.phone,
        quarter:        user.quarter,
        division:       user.division,
        avatarInitials: user.avatar_initials,
        ...(artisanProfile && {
          artisanProfileId: artisanProfile.id,
          trustScore:       artisanProfile.trust_score,
          avgRating:        artisanProfile.avg_rating,
          availability:     artisanProfile.availability_status,
        }),
      },
    })

  } catch (err) {
    next(err)
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Returns the current user's data from DB using their JWT
// Useful for refreshing user data after profile updates
const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, phone, quarter, division, avatar_initials, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    res.status(200).json({ user: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login, getMe }