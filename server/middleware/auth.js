const jwt = require('jsonwebtoken')

// ── verifyToken ──────────────────────────────────────────────────────────────
// Checks every protected route for a valid JWT in the Authorization header
// Usage on a route: router.get('/protected', verifyToken, controller)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']

  // Token must arrive as: Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // Attach user info to the request so controllers can access it
    // e.g. req.user.id, req.user.role, req.user.email
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' })
  }
}

// ── requireRole ──────────────────────────────────────────────────────────────
// Used after verifyToken to restrict routes to specific roles
// Usage: router.get('/admin-only', verifyToken, requireRole('admin'), controller)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`
      })
    }
    next()
  }
}

module.exports = { verifyToken, requireRole }