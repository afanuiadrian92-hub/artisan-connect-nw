const pool = require('../db/pool')
const { updateTrustScore } = require('../utils/trustScore')
const { getDivisionByQuarter } = require('../utils/nwRegion')
const { get } = require('../routes/ai')

// ── GET /api/artisans ─────────────────────────────────────────────────────────
// Public search — customers and guests can search without logging in
// Supports filtering by quarter, service category, and text query
const searchArtisans = async (req, res, next) => {
  try {
    const {
      q        = '',
      quarter  = '',
      service  = '',
      page     = 1,
      limit    = 12,
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(limit)
    const params = []
    let paramCount = 0

    // Build query dynamically based on which filters are provided
    // Only available artisans appear in search results
    let query = `
      SELECT
        u.id,
        u.full_name,
        u.quarter,
        u.division,
        u.avatar_initials,
        ap.id            AS artisan_profile_id,
        ap.bio,
        ap.trust_score,
        ap.avg_rating,
        ap.total_jobs,
        ap.availability_status,
        ap.lat,
        ap.lon,
        -- Primary service (highest rate)
        (SELECT title FROM artisan_services
         WHERE artisan_id = ap.id
         ORDER BY rate_per_hour DESC LIMIT 1) AS primary_service,
        (SELECT rate_per_hour FROM artisan_services
         WHERE artisan_id = ap.id
         ORDER BY rate_per_hour DESC LIMIT 1) AS rate_per_hour,
        -- Service category name for filtering
        (SELECT sc.name FROM artisan_services asv
         JOIN service_categories sc ON asv.category_id = sc.id
         WHERE asv.artisan_id = ap.id LIMIT 1) AS category_name
      FROM users u
      JOIN artisan_profiles ap ON u.id = ap.user_id
      WHERE u.role = 'artisan'
        AND ap.availability_status != 'unavailable'
    `

    // Quarter filter
    if (quarter && quarter !== 'All Quarters') {
      paramCount++
      query += ` AND u.quarter = $${paramCount}`
      params.push(quarter)
    }

    // Text search across name and services
    if (q) {
      paramCount++
      query += ` AND (
        u.full_name ILIKE $${paramCount}
        OR EXISTS (
          SELECT 1 FROM artisan_services asv
          JOIN service_categories sc ON asv.category_id = sc.id
          WHERE asv.artisan_id = ap.id
            AND (asv.title ILIKE $${paramCount} OR sc.name ILIKE $${paramCount})
        )
      )`
      params.push(`%${q}%`)
    }

    // Service category filter
    if (service && service !== 'All Services') {
      paramCount++
      query += ` AND EXISTS (
        SELECT 1 FROM artisan_services asv
        JOIN service_categories sc ON asv.category_id = sc.id
        WHERE asv.artisan_id = ap.id AND sc.name = $${paramCount}
      )`
      params.push(service)
    }

    // Sort by trust score desc — highest trust appears first
    query += ` ORDER BY ap.trust_score DESC, ap.avg_rating DESC`

    // Pagination
    paramCount++
    query += ` LIMIT $${paramCount}`
    params.push(parseInt(limit))

    paramCount++
    query += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await pool.query(query, params)

    // Count total for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u
       JOIN artisan_profiles ap ON u.id = ap.user_id
       WHERE u.role = 'artisan' AND ap.availability_status != 'unavailable'`,
      []
    )

    res.status(200).json({
      artisans:   result.rows,
      total:      parseInt(countResult.rows[0].count),
      page:       parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/artisans/:id ─────────────────────────────────────────────────────
// Public single artisan profile — used by the View Profile page
const getArtisanById = async (req, res, next) => {
  try {
    const { id } = req.params

    // Main profile data
    const profileResult = await pool.query(
      `SELECT
         u.id, u.full_name, u.quarter, u.division, u.phone, u.avatar_initials,
         ap.id AS artisan_profile_id, ap.bio, ap.trust_score,
         ap.avg_rating, ap.total_jobs, ap.response_rate,
         ap.availability_status, ap.lat, ap.lon
       FROM users u
       JOIN artisan_profiles ap ON u.id = ap.user_id
       WHERE u.id = $1 AND u.role = 'artisan'`,
      [id]
    )

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan not found.' })
    }

    const artisan = profileResult.rows[0]

    // Services offered
    const servicesResult = await pool.query(
      `SELECT asv.id, asv.title, asv.description, asv.rate_per_hour,
              sc.name AS category
       FROM artisan_services asv
       JOIN service_categories sc ON asv.category_id = sc.id
       WHERE asv.artisan_id = $1
       ORDER BY asv.rate_per_hour DESC`,
      [artisan.artisan_profile_id]
    )

    // Verified documents (only show status — not the file URL publicly)
    const docsResult = await pool.query(
      `SELECT doc_name, status, expiry_date
       FROM verification_documents
       WHERE artisan_id = $1 AND status = 'verified'`,
      [artisan.artisan_profile_id]
    )

    // Recent reviews (last 5)
    const reviewsResult = await pool.query(
      `SELECT r.stars, r.comment, r.created_at,
              u.full_name AS customer_name, u.avatar_initials
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.artisan_id = $1
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [artisan.artisan_profile_id]
    )

    res.status(200).json({
      ...artisan,
      services:          servicesResult.rows,
      verifiedDocuments: docsResult.rows,
      recentReviews:     reviewsResult.rows,
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/artisan/dashboard ────────────────────────────────────────────────
// Private — artisan's own dashboard stats
const getArtisanDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get artisan profile
    const profileResult = await pool.query(
      `SELECT ap.id, ap.trust_score, ap.avg_rating, ap.total_jobs,
              ap.response_rate, ap.availability_status
       FROM artisan_profiles ap
       WHERE ap.user_id = $1`,
      [userId]
    )

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found.' })
    }

    const profile = profileResult.rows[0]
    const artisanProfileId = profile.id

    // Earnings total from completed + paid bookings
    const earningsResult = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) AS total_earnings
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE b.artisan_id = $1 AND p.status = 'completed'`,
      [artisanProfileId]
    )

    // Active bookings count
    const activeResult = await pool.query(
      `SELECT COUNT(*) FROM bookings
       WHERE artisan_id = $1
         AND status IN ('confirmed', 'in-progress')`,
      [artisanProfileId]
    )

    // Incoming requests (job posts in artisan's quarter they haven't quoted yet)
    const requestsResult = await pool.query(
      `SELECT jp.id, jp.title, jp.description, jp.quarter, jp.division,
              jp.budget_min, jp.budget_max, jp.created_at,
              u.full_name AS customer_name, u.avatar_initials,
              sc.name AS category
       FROM job_posts jp
       JOIN users u ON jp.customer_id = u.id
       JOIN service_categories sc ON jp.category_id = sc.id
       WHERE jp.status = 'open'
         AND NOT EXISTS (
           SELECT 1 FROM quotes q
           WHERE q.job_id = jp.id AND q.artisan_id = $1
         )
       ORDER BY jp.created_at DESC
       LIMIT 10`,
      [artisanProfileId]
    )

    // Upcoming confirmed jobs
    const upcomingResult = await pool.query(
      `SELECT b.id, b.scheduled_date, b.scheduled_time, b.location,
              b.total_amount, b.status,
              u.full_name AS customer_name, u.avatar_initials,
              jp.title AS service_title
       FROM bookings b
       JOIN users u ON b.customer_id = u.id
       JOIN job_posts jp ON b.job_id = jp.id
       WHERE b.artisan_id = $1
         AND b.status IN ('confirmed', 'in-progress')
         AND b.scheduled_date >= CURRENT_DATE
       ORDER BY b.scheduled_date ASC, b.scheduled_time ASC
       LIMIT 5`,
      [artisanProfileId]
    )

    res.status(200).json({
      trustScore:      profile.trust_score,
      avgRating:       parseFloat(profile.avg_rating) || 0,
      totalJobs:       profile.total_jobs,
      responseRate:    profile.response_rate,
      availability:    profile.availability_status,
      totalEarnings:   parseInt(earningsResult.rows[0].total_earnings),
      activeBookings:  parseInt(activeResult.rows[0].count),
      incomingRequests: requestsResult.rows,
      upcomingJobs:    upcomingResult.rows,
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/artisan/profile ────────────────────────────────────────────────
// Artisan updates their own profile info
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { fullName, phone, quarter, bio } = req.body

    const division = quarter ? getDivisionByQuarter(quarter) : null

    // Update users table
    await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone     = COALESCE($2, phone),
           quarter   = COALESCE($3, quarter),
           division  = COALESCE($4, division)
       WHERE id = $5`,
      [fullName, phone, quarter, division, userId]
    )

    // Update artisan_profiles bio
    if (bio !== undefined) {
      await pool.query(
        `UPDATE artisan_profiles SET bio = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [bio, userId]
      )
    }

    res.status(200).json({ message: 'Profile updated successfully.' })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/artisan/availability ──────────────────────────────────────────
// Toggle availability status — reflects immediately in search results
const updateAvailability = async (req, res, next) => {
  try {
    const { status } = req.body
    const validStatuses = ['available', 'busy', 'unavailable']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(', ')}`
      })
    }

    await pool.query(
      `UPDATE artisan_profiles
       SET availability_status = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [status, req.user.id]
    )

    // Log the change for admin visibility
    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'system', $2)`,
      [req.user.id, `Your availability status was updated to "${status}".`]
    )

    res.status(200).json({
      message: `Availability updated to "${status}".`,
      status,
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/artisan/services ────────────────────────────────────────────────
// Add a new service to the artisan's menu
const addService = async (req, res, next) => {
  try {
    const { title, description, categoryId, ratePerHour } = req.body

    if (!title || !ratePerHour || !categoryId) {
      return res.status(400).json({
        error: 'Title, category, and rate per hour are required.'
      })
    }

    // Get artisan profile id from user id
    const profileResult = await pool.query(
      `SELECT id FROM artisan_profiles WHERE user_id = $1`,
      [req.user.id]
    )

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found.' })
    }

    const artisanProfileId = profileResult.rows[0].id

    const result = await pool.query(
      `INSERT INTO artisan_services
         (artisan_id, category_id, title, description, rate_per_hour)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [artisanProfileId, categoryId, title, description || null, ratePerHour]
    )

    res.status(201).json({
      message: 'Service added successfully.',
      service: result.rows[0],
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/artisan/services/:id ──────────────────────────────────────────
// Edit an existing service — artisan can only edit their own
const updateService = async (req, res, next) => {
  try {
    const { id }  = req.params
    const { title, description, ratePerHour } = req.body

    // Confirm the service belongs to this artisan
    const ownerCheck = await pool.query(
      `SELECT asv.id FROM artisan_services asv
       JOIN artisan_profiles ap ON asv.artisan_id = ap.id
       WHERE asv.id = $1 AND ap.user_id = $2`,
      [id, req.user.id]
    )

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Service not found or you do not have permission to edit it.'
      })
    }

    const result = await pool.query(
      `UPDATE artisan_services
       SET title         = COALESCE($1, title),
           description   = COALESCE($2, description),
           rate_per_hour = COALESCE($3, rate_per_hour)
       WHERE id = $4
       RETURNING *`,
      [title, description, ratePerHour, id]
    )

    res.status(200).json({
      message: 'Service updated.',
      service: result.rows[0],
    })
  } catch (err) {
    next(err)
  }
}

// ── DELETE /api/artisan/services/:id ─────────────────────────────────────────
const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params

    // Ownership check before deletion
    const ownerCheck = await pool.query(
      `SELECT asv.id FROM artisan_services asv
       JOIN artisan_profiles ap ON asv.artisan_id = ap.id
       WHERE asv.id = $1 AND ap.user_id = $2`,
      [id, req.user.id]
    )

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Service not found or you do not have permission to delete it.'
      })
    }

    await pool.query(`DELETE FROM artisan_services WHERE id = $1`, [id])

    res.status(200).json({ message: 'Service deleted.' })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/artisan/documents ───────────────────────────────────────────────
// Upload a verification document — file goes to Cloudinary via multer middleware
// The URL returned by Cloudinary is stored in the database
const uploadDocument = async (req, res, next) => {
  try {
    const { docName, expiryDate } = req.body

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' })
    }
    if (!docName) {
      return res.status(400).json({ error: 'Document name is required.' })
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

    // req.file.path is the Cloudinary URL — multer-storage-cloudinary sets this
    const result = await pool.query(
      `INSERT INTO verification_documents
         (artisan_id, doc_name, file_url, status, expiry_date)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING *`,
      [
        artisanProfileId,
        docName,
        req.file.path,  // Cloudinary secure URL
        expiryDate || null,
      ]
    )

    // Recalculate trust score — a new pending document changes the ratio
    await updateTrustScore(pool, artisanProfileId)

    // Notify admin that a new document needs review
    const adminResult = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    )
    if (adminResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message)
         VALUES ($1, 'verification', $2)`,
        [
          adminResult.rows[0].id,
          `New document uploaded by artisan ID ${req.user.id}: "${docName}" — pending review.`,
        ]
      )
    }

    res.status(201).json({
      message:  'Document uploaded successfully. Pending admin review.',
      document: result.rows[0],
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/artisan/documents ────────────────────────────────────────────────
// Artisan views their own documents and statuses
const getDocuments = async (req, res, next) => {
  try {
    const profileResult = await pool.query(
      `SELECT id FROM artisan_profiles WHERE user_id = $1`,
      [req.user.id]
    )

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found.' })
    }

    const result = await pool.query(
      `SELECT id, doc_name, file_url, status, rejection_reason,
              expiry_date, uploaded_at
       FROM verification_documents
       WHERE artisan_id = $1
       ORDER BY uploaded_at DESC`,
      [profileResult.rows[0].id]
    )

    res.status(200).json({ documents: result.rows })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/artisans/recommended ────────────────────────────────────────────
// Returns top artisans by trust score for the customer dashboard
// New artisans (< 5 jobs) are included with a boosted visibility flag
// so the frontend can display an AI-generated recommendation blurb
const getRecommended = async (req, res, next) => {
  try {
    const { quarter = '', limit = 6 } = req.query

    let query = `
      SELECT
        u.id, u.full_name, u.quarter, u.avatar_initials,
        ap.id AS artisan_profile_id,
        ap.trust_score, ap.avg_rating, ap.total_jobs,
        ap.availability_status,
        (SELECT title FROM artisan_services
         WHERE artisan_id = ap.id ORDER BY rate_per_hour DESC LIMIT 1) AS primary_service,
        (SELECT rate_per_hour FROM artisan_services
         WHERE artisan_id = ap.id ORDER BY rate_per_hour DESC LIMIT 1) AS rate_per_hour,
        -- Flag new artisans for AI blurb generation on the frontend
        CASE WHEN ap.total_jobs < 5 THEN true ELSE false END AS is_new_artisan
      FROM users u
      JOIN artisan_profiles ap ON u.id = ap.user_id
      WHERE u.role = 'artisan'
        AND ap.availability_status = 'available'
    `

    const params = []
    if (quarter && quarter !== 'All Quarters') {
      params.push(quarter)
      query += ` AND u.quarter = $1`
    }

    // Established artisans ranked by trust score
    // New artisans (< 5 jobs) included at the end for visibility
    query += `
      ORDER BY
        CASE WHEN ap.total_jobs >= 5 THEN 0 ELSE 1 END,
        ap.trust_score DESC,
        ap.avg_rating DESC
      LIMIT $${params.length + 1}
    `
    params.push(parseInt(limit))

    const result = await pool.query(query, params)

    res.status(200).json({ artisans: result.rows })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/artisans/top ─────────────────────────────────────────────────────
// Returns top 3 artisans for the customer dashboard "Recommended this week"
// Ranked by: trust score + avg rating + jobs completed this week
// New artisans (< 5 jobs) included at end with is_new flag for AI blurb
const getTopArtisans = async (req, res, next) => {
  try {
    const { quarter = '' } = req.query

    const params = []
    let quarterFilter = ''
    if (quarter && quarter !== 'All Quarters') {
      params.push(quarter)
      quarterFilter = `AND u.quarter = $${params.length}`
    }

    // Main ranking query
    // Weights: trust_score (primary) + avg_rating (secondary) + recent activity
    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.quarter,
        u.avatar_initials,
        ap.id              AS artisan_profile_id,
        ap.trust_score,
        ap.avg_rating,
        ap.total_jobs,
        ap.availability_status,
        -- Primary service name and rate
        (SELECT asv.title FROM artisan_services asv
         WHERE asv.artisan_id = ap.id
         ORDER BY asv.rate_per_hour DESC LIMIT 1)         AS primary_service,
        (SELECT asv.rate_per_hour FROM artisan_services asv
         WHERE asv.artisan_id = ap.id
         ORDER BY asv.rate_per_hour DESC LIMIT 1)         AS rate_per_hour,
        (SELECT sc.name FROM artisan_services asv
         JOIN service_categories sc ON asv.category_id = sc.id
         WHERE asv.artisan_id = ap.id LIMIT 1)            AS category,
        -- Jobs completed this week — boosts recently active artisans
        (SELECT COUNT(*) FROM bookings b
         WHERE b.artisan_id = ap.id
           AND b.status = 'completed'
           AND b.created_at >= NOW() - INTERVAL '7 days') AS jobs_this_week,
        -- Flag new artisans for AI blurb on the frontend
        CASE WHEN ap.total_jobs < 5 THEN true ELSE false END AS is_new_artisan
      FROM users u
      JOIN artisan_profiles ap ON u.id = ap.user_id
      WHERE u.role = 'artisan'
        AND ap.availability_status = 'available'
        AND ap.trust_score > 0
        ${quarterFilter}
      ORDER BY
        -- Established artisans ranked by composite score first
        CASE WHEN ap.total_jobs >= 5 THEN 0 ELSE 1 END,
        ap.trust_score       DESC,
        ap.avg_rating        DESC,
        jobs_this_week       DESC
      LIMIT 3
    `, params)

    res.status(200).json({
      artisans: result.rows,
      week:     new Date().toISOString().split('T')[0],
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  searchArtisans,
  getArtisanById,
  getArtisanDashboard,
  updateProfile,
  updateAvailability,
  addService,
  updateService,
  deleteService,
  uploadDocument,
  getDocuments,
  getRecommended,
  getTopArtisans,
}