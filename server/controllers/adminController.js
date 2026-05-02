const pool = require('../db/pool')
const { updateTrustScore } = require('../utils/trustScore')

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
const getAdminDashboard = async (req, res, next) => {
  try {
    const totalsResult = await pool.query(`
      SELECT
        COUNT(*)                                        AS total_users,
        COUNT(*) FILTER (WHERE role = 'customer')      AS total_customers,
        COUNT(*) FILTER (WHERE role = 'artisan')       AS total_artisans
      FROM users
    `)

    const bookingTotalsResult = await pool.query(`
      SELECT
        COUNT(*)                                            AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed')       AS completed_bookings
      FROM bookings
    `)

    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_revenue
      FROM payments WHERE status = 'completed'
    `)

    // Bookings by NW Region division — feeds the bar chart
    const divisionResult = await pool.query(`
      SELECT division, COUNT(*) AS bookings
      FROM job_posts
      WHERE division IS NOT NULL
      GROUP BY division
      ORDER BY bookings DESC
    `)

    // Top services by booking count — feeds the pie chart
    const servicesResult = await pool.query(`
      SELECT sc.name AS service, COUNT(jp.id) AS count
      FROM job_posts jp
      JOIN service_categories sc ON jp.category_id = sc.id
      GROUP BY sc.name
      ORDER BY count DESC
      LIMIT 6
    `)

    // Monthly user growth — last 6 months — feeds the line chart
    const growthResult = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        COUNT(*) FILTER (WHERE role = 'customer')        AS customers,
        COUNT(*) FILTER (WHERE role = 'artisan')         AS artisans
      FROM users
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `)

    // Recent admin notifications for the activity feed
    const activityResult = await pool.query(`
      SELECT message, type, created_at
      FROM notifications
      WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')
      ORDER BY created_at DESC
      LIMIT 10
    `)

    // Pending verification count — drives the badge on the sidebar
    const pendingResult = await pool.query(`
      SELECT COUNT(*) AS pending
      FROM verification_documents WHERE status = 'pending'
    `)

    res.status(200).json({
      totals: {
        users:             parseInt(totalsResult.rows[0].total_users),
        customers:         parseInt(totalsResult.rows[0].total_customers),
        artisans:          parseInt(totalsResult.rows[0].total_artisans),
        bookings:          parseInt(bookingTotalsResult.rows[0].total_bookings),
        completedBookings: parseInt(bookingTotalsResult.rows[0].completed_bookings),
        revenue:           parseInt(revenueResult.rows[0].total_revenue),
      },
      bookingsByDivision:  divisionResult.rows,
      topServices:         servicesResult.rows,
      userGrowth:          growthResult.rows,
      recentActivity:      activityResult.rows,
      pendingVerifications:parseInt(pendingResult.rows[0].pending),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/verification ───────────────────────────────────────────────
// All documents in a given status — defaults to pending
const getVerificationQueue = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query

    const result = await pool.query(`
      SELECT
        vd.id, vd.doc_name, vd.file_url, vd.status,
        vd.rejection_reason, vd.expiry_date, vd.uploaded_at,
        ap.id AS artisan_profile_id, ap.trust_score,
        u.id AS user_id, u.full_name, u.email,
        u.quarter, u.avatar_initials
      FROM verification_documents vd
      JOIN artisan_profiles ap ON vd.artisan_id = ap.id
      JOIN users u ON ap.user_id = u.id
      WHERE vd.status = $1
      ORDER BY vd.uploaded_at ASC
    `, [status])

    res.status(200).json({ documents: result.rows })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/verification/:docId ─────────────────────────────────────
// Approve or reject a document — triggers trust score recalculation
const reviewDocument = async (req, res, next) => {
  try {
    const { docId } = req.params
    const { action, rejectionReason } = req.body

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject.' })
    }
    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({
        error: 'A rejection reason is required when rejecting a document.'
      })
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected'

    const docResult = await pool.query(
      `SELECT vd.*, ap.id AS artisan_profile_id, ap.user_id
       FROM verification_documents vd
       JOIN artisan_profiles ap ON vd.artisan_id = ap.id
       WHERE vd.id = $1`,
      [docId]
    )
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' })
    }
    const doc = docResult.rows[0]

    await pool.query(
      `UPDATE verification_documents
       SET status = $1, rejection_reason = $2 WHERE id = $3`,
      [newStatus, rejectionReason || null, docId]
    )

    // Recalculate trust score immediately after verification decision
    const newScore = await updateTrustScore(pool, doc.artisan_id)

    // Notify the artisan
    await pool.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'verification', $2)`,
      [
        doc.user_id,
        action === 'approve'
          ? `Your document "${doc.doc_name}" has been verified. Trust score updated to ${newScore}%.`
          : `Your document "${doc.doc_name}" was rejected. Reason: ${rejectionReason}`,
      ]
    )

    // Admin audit log
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id)
       VALUES ($1, $2, 'verification_document', $3)`,
      [req.user.id, `Document ${action}d`, docId]
    )

    res.status(200).json({
      message:       `Document ${action}d successfully.`,
      newStatus,
      newTrustScore: newScore,
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { role = '', q = '', page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const params = []
    let n = 0

    let query = `
      SELECT
        u.id, u.full_name, u.email, u.role, u.phone,
        u.quarter, u.division, u.avatar_initials, u.created_at,
        ap.trust_score, ap.avg_rating, ap.total_jobs, ap.availability_status
      FROM users u
      LEFT JOIN artisan_profiles ap ON u.id = ap.user_id
      WHERE 1=1
    `

    if (role) { n++; query += ` AND u.role = $${n}`; params.push(role) }
    if (q)    { n++; query += ` AND (u.full_name ILIKE $${n} OR u.email ILIKE $${n})`; params.push(`%${q}%`) }

    n++; query += ` ORDER BY u.created_at DESC LIMIT $${n}`; params.push(parseInt(limit))
    n++; query += ` OFFSET $${n}`; params.push(offset)

    const result     = await pool.query(query, params)
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users WHERE 1=1 ${role ? `AND role = '${role}'` : ''}`
    )

    res.status(200).json({
      users:      result.rows,
      total:      parseInt(countResult.rows[0].count),
      page:       parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/users/:id/suspend ───────────────────────────────────────
// Requires adding is_suspended boolean column to users table (see schema note)
const suspendUser = async (req, res, next) => {
  try {
    const { id }     = req.params
    const { action } = req.body

    if (!['suspend', 'reactivate'].includes(action)) {
      return res.status(400).json({ error: 'Action must be suspend or reactivate.' })
    }

    const targetUser = await pool.query(`SELECT role FROM users WHERE id = $1`, [id])
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }
    if (targetUser.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'Cannot suspend an admin account.' })
    }

    await pool.query(
      `UPDATE users SET is_suspended = $1 WHERE id = $2`,
      [action === 'suspend', id]
    )

    await pool.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'system', $2)`,
      [
        id,
        action === 'suspend'
          ? 'Your account has been suspended. Contact support.'
          : 'Your account has been reactivated. Welcome back.',
      ]
    )

    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id)
       VALUES ($1, $2, 'user', $3)`,
      [req.user.id, `User ${action}ed`, id]
    )

    res.status(200).json({ message: `User ${action}ed successfully.` })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/bookings ───────────────────────────────────────────────────
const getAllBookings = async (req, res, next) => {
  try {
    const { status = '', page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const params = []

    let query = `
      SELECT
        b.id, b.status, b.scheduled_date, b.total_amount, b.created_at,
        jp.title AS service_title, jp.quarter,
        cu.full_name AS customer_name, cu.email AS customer_email,
        au.full_name AS artisan_name, au.email AS artisan_email,
        p.status AS payment_status, p.momo_transaction_id
      FROM bookings b
      JOIN job_posts jp   ON b.job_id = jp.id
      JOIN users cu       ON b.customer_id = cu.id
      JOIN artisan_profiles ap ON b.artisan_id = ap.id
      JOIN users au       ON ap.user_id = au.id
      LEFT JOIN payments p ON p.booking_id = b.id
    `

    if (status) { query += ` WHERE b.status = $1`; params.push(status) }
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), offset)

    const result = await pool.query(query, params)
    res.status(200).json({ bookings: result.rows })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/bookings/:id/complete ────────────────────────────────────
// Admin manually completes a booking — used for dispute resolution
const completeBooking = async (req, res, next) => {
  try {
    const { id } = req.params

    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`, [id]
    )
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' })
    }

    await pool.query(`UPDATE bookings SET status = 'completed' WHERE id = $1`, [id])

    // Increment total_jobs on the artisan profile
    await pool.query(
      `UPDATE artisan_profiles
       SET total_jobs = total_jobs + 1, updated_at = NOW()
       WHERE id = $1`,
      [bookingResult.rows[0].artisan_id]
    )

    await updateTrustScore(pool, bookingResult.rows[0].artisan_id)

    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id)
       VALUES ($1, 'Booking manually completed', 'booking', $2)`,
      [req.user.id, id]
    )

    res.status(200).json({ message: 'Booking marked as completed.' })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAdminDashboard,
  getVerificationQueue,
  reviewDocument,
  getUsers,
  suspendUser,
  getAllBookings,
  completeBooking,
}