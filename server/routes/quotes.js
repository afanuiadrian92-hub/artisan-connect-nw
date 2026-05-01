const express = require('express')
const router  = express.Router()
const pool    = require('../db/pool')
const { verifyToken, requireRole } = require('../middleware/auth')

// ── POST /api/quotes ──────────────────────────────────────────────────────────
// Artisan submits a quote on an open job post
router.post('/', verifyToken, requireRole('artisan'), async (req, res, next) => {
  try {
    const { jobId, price, message, estimatedHours } = req.body

    if (!jobId || !price) {
      return res.status(400).json({ error: 'Job ID and price are required.' })
    }

    // Get artisan profile id
    const profileResult = await pool.query(
      `SELECT id FROM artisan_profiles WHERE user_id = $1`,
      [req.user.id]
    )
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found.' })
    }
    const artisanProfileId = profileResult.rows[0].id

    // Confirm job is still open
    const jobResult = await pool.query(
      `SELECT * FROM job_posts WHERE id = $1 AND status = 'open'`,
      [jobId]
    )
    if (jobResult.rows.length === 0) {
      return res.status(400).json({ error: 'Job post not found or no longer open.' })
    }

    // Prevent duplicate quotes from same artisan
    const existing = await pool.query(
      `SELECT id FROM quotes WHERE job_id = $1 AND artisan_id = $2`,
      [jobId, artisanProfileId]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already quoted on this job.' })
    }

    const result = await pool.query(
      `INSERT INTO quotes (job_id, artisan_id, price, message, estimated_hours, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [jobId, artisanProfileId, price, message || null, estimatedHours || null]
    )

    // Mark job as quoted (still open for more quotes)
    await pool.query(
      `UPDATE job_posts SET status = 'quoted' WHERE id = $1 AND status = 'open'`,
      [jobId]
    )

    // Notify the customer that a new quote arrived
    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'booking', $2)`,
      [
        jobResult.rows[0].customer_id,
        `You received a new quote of XAF ${price.toLocaleString()} for "${jobResult.rows[0].title}".`,
      ]
    )

    res.status(201).json({
      message: 'Quote submitted successfully.',
      quote:   result.rows[0],
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/quotes/artisan ───────────────────────────────────────────────────
// Artisan views all quotes they have submitted
router.get('/artisan', verifyToken, requireRole('artisan'), async (req, res, next) => {
  try {
    const profileResult = await pool.query(
      `SELECT id FROM artisan_profiles WHERE user_id = $1`,
      [req.user.id]
    )
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found.' })
    }

    const result = await pool.query(
      `SELECT
         q.id, q.price, q.message, q.estimated_hours, q.status, q.created_at,
         jp.title, jp.description, jp.quarter, jp.budget_min, jp.budget_max,
         sc.name AS category,
         u.full_name AS customer_name
       FROM quotes q
       JOIN job_posts jp ON q.job_id = jp.id
       JOIN service_categories sc ON jp.category_id = sc.id
       JOIN users u ON jp.customer_id = u.id
       WHERE q.artisan_id = $1
       ORDER BY q.created_at DESC`,
      [profileResult.rows[0].id]
    )

    res.status(200).json({ quotes: result.rows })
  } catch (err) {
    next(err)
  }
})

module.exports = router