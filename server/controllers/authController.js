const pool   = require('../db/pool')
const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { getDivisionByQuarter } = require('../utils/nwRegion')

const generateToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
)

const getInitials = (name) => {
  const parts = name.trim().split(' ')
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { fullName, email, phone, quarter, password, role, adminSecret } = req.body

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, email, password and role are required.' })
    }

    if (!['customer', 'artisan', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be customer, artisan, or admin.' })
    }

    // Admin registration is gated by a secret key in .env
    // This prevents any public user from registering as admin via the UI form
    // For Thunder Client tests add: "adminSecret": "value_from_your_.env"
    if (role === 'admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({
          error: 'Admin registration requires a valid admin secret key.'
        })
      }
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1', [email.toLowerCase()]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const division     = getDivisionByQuarter(quarter) || null

    const userResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, quarter, division, avatar_initials)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, full_name, email, role, phone, quarter, division, avatar_initials`,
      [fullName.trim(), email.toLowerCase().trim(), passwordHash, role,
       phone || null, quarter || null, division, getInitials(fullName)]
    )

    const user = userResult.rows[0]

    if (role === 'artisan') {
      await pool.query(
        `INSERT INTO artisan_profiles (user_id, availability_status, trust_score)
         VALUES ($1, 'available', 0)`,
        [user.id]
      )
    }

    const token = generateToken(user)

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id, fullName: user.full_name, email: user.email,
        role: user.role, phone: user.phone, quarter: user.quarter,
        division: user.division, avatarInitials: user.avatar_initials,
      },
    })
  } catch (err) { next(err) }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role, phone,
              quarter, division, avatar_initials, is_suspended
       FROM users WHERE email=$1`,
      [email.toLowerCase().trim()]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const user = result.rows[0]

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' })
    }

    if (role && user.role !== role) {
      return res.status(401).json({
        error: `This account is registered as a ${user.role}, not a ${role}.`
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    let artisanProfile = null
    if (user.role === 'artisan') {
      const profileResult = await pool.query(
        `SELECT id, trust_score, avg_rating, availability_status
         FROM artisan_profiles WHERE user_id=$1`,
        [user.id]
      )
      if (profileResult.rows.length > 0) artisanProfile = profileResult.rows[0]
    }

    const token = generateToken(user)

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id, fullName: user.full_name, email: user.email,
        role: user.role, phone: user.phone, quarter: user.quarter,
        division: user.division, avatarInitials: user.avatar_initials,
        ...(artisanProfile && {
          artisanProfileId: artisanProfile.id,
          trustScore:       artisanProfile.trust_score,
          avgRating:        artisanProfile.avg_rating,
          availability:     artisanProfile.availability_status,
        }),
      },
    })
  } catch (err) { next(err) }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, phone, quarter, division,
              avatar_initials, created_at FROM users WHERE id=$1`,
      [req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' })
    res.status(200).json({ user: result.rows[0] })
  } catch (err) { next(err) }
}

module.exports = { register, login, getMe }