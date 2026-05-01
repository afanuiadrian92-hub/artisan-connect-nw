const pool = require('../db/pool')

// ── GET /api/customer/dashboard ───────────────────────────────────────────────
// Customer's own dashboard stats and recent activity
const getCustomerDashboard = async (req, res, next) => {
  try {
    const customerId = req.user.id

    // Booking counts by status
    const statsResult = await pool.query(
      `SELECT
         COUNT(*)                                           AS total_bookings,
         COUNT(*) FILTER (WHERE status = 'completed')      AS completed,
         COUNT(*) FILTER (WHERE status = 'in-progress')    AS in_progress,
         COUNT(*) FILTER (WHERE status = 'confirmed')      AS scheduled
       FROM bookings
       WHERE customer_id = $1`,
      [customerId]
    )

    // Average rating the customer has given across all their reviews
    const ratingResult = await pool.query(
      `SELECT COALESCE(AVG(stars), 0) AS avg_rating_given
       FROM reviews WHERE customer_id = $1`,
      [customerId]
    )

    // Recent bookings with artisan and service info
    const recentResult = await pool.query(
      `SELECT
         b.id, b.status, b.scheduled_date, b.total_amount, b.created_at,
         jp.title AS service_title,
         u.full_name AS artisan_name, u.avatar_initials,
         -- Check if customer already left a review for this booking
         EXISTS (
           SELECT 1 FROM reviews r WHERE r.booking_id = b.id
         ) AS has_review
       FROM bookings b
       JOIN job_posts jp ON b.job_id = jp.id
       JOIN artisan_profiles ap ON b.artisan_id = ap.id
       JOIN users u ON ap.user_id = u.id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC
       LIMIT 5`,
      [customerId]
    )

    const stats = statsResult.rows[0]

    res.status(200).json({
      totalBookings:  parseInt(stats.total_bookings),
      completed:      parseInt(stats.completed),
      inProgress:     parseInt(stats.in_progress),
      scheduled:      parseInt(stats.scheduled),
      avgRatingGiven: parseFloat(ratingResult.rows[0].avg_rating_given).toFixed(1),
      recentBookings: recentResult.rows,
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/customer/jobs ───────────────────────────────────────────────────
// Customer posts a new job request — artisans can then quote on it
const createJobPost = async (req, res, next) => {
  try {
    const {
      title, description, categoryId,
      quarter, budgetMin, budgetMax,
    } = req.body

    if (!title || !categoryId || !quarter) {
      return res.status(400).json({
        error: 'Title, category, and quarter are required.'
      })
    }

    // Derive division from quarter for analytics
    const { getDivisionByQuarter } = require('../utils/nwRegion')
    const division = getDivisionByQuarter(quarter) || null

    const result = await pool.query(
      `INSERT INTO job_posts
         (customer_id, category_id, title, description,
          quarter, division, budget_min, budget_max, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
       RETURNING *`,
      [
        req.user.id, categoryId, title,
        description || null, quarter, division,
        budgetMin || null, budgetMax || null,
      ]
    )

    const jobPost = result.rows[0]

    // Notify artisans in the same quarter who offer this service
    // Find relevant artisans to notify
    const artisansResult = await pool.query(
      `SELECT u.id FROM users u
       JOIN artisan_profiles ap ON u.id = ap.user_id
       JOIN artisan_services asv ON asv.artisan_id = ap.id
       WHERE u.quarter = $1
         AND asv.category_id = $2
         AND ap.availability_status = 'available'
       LIMIT 20`,
      [quarter, categoryId]
    )

    // Insert a notification for each relevant artisan
    if (artisansResult.rows.length > 0) {
      const notifValues = artisansResult.rows.map((a) =>
        `(${a.id}, 'booking', 'New job request in ${quarter}: "${title}"')`
      ).join(', ')

      await pool.query(
        `INSERT INTO notifications (user_id, type, message) VALUES ${notifValues}`
      )
    }

    res.status(201).json({
      message: 'Job posted successfully. Artisans in your area will be notified.',
      jobPost,
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/customer/jobs ────────────────────────────────────────────────────
// Customer views their own job posts and how many quotes each has received
const getMyJobPosts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         jp.*,
         sc.name AS category_name,
         COUNT(q.id) AS quote_count
       FROM job_posts jp
       JOIN service_categories sc ON jp.category_id = sc.id
       LEFT JOIN quotes q ON q.job_id = jp.id
       WHERE jp.customer_id = $1
       GROUP BY jp.id, sc.name
       ORDER BY jp.created_at DESC`,
      [req.user.id]
    )

    res.status(200).json({ jobPosts: result.rows })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/customer/jobs/:id/quotes ─────────────────────────────────────────
// Customer views all quotes submitted for one of their job posts
const getQuotesForJob = async (req, res, next) => {
  try {
    const { id } = req.params

    // Confirm this job belongs to the requesting customer
    const jobCheck = await pool.query(
      `SELECT id FROM job_posts WHERE id = $1 AND customer_id = $2`,
      [id, req.user.id]
    )
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job post not found.' })
    }

    const result = await pool.query(
      `SELECT
         q.id, q.price, q.message, q.estimated_hours,
         q.status, q.created_at,
         u.id AS artisan_user_id, u.full_name AS artisan_name,
         u.quarter, u.avatar_initials,
         ap.trust_score, ap.avg_rating, ap.total_jobs
       FROM quotes q
       JOIN artisan_profiles ap ON q.artisan_id = ap.id
       JOIN users u ON ap.user_id = u.id
       WHERE q.job_id = $1
       ORDER BY ap.trust_score DESC, q.price ASC`,
      [id]
    )

    res.status(200).json({ quotes: result.rows })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/customer/jobs/:id/quotes/:quoteId/accept ────────────────────────
// Customer accepts a quote — creates a booking and closes the job post
const acceptQuote = async (req, res, next) => {
  try {
    const { id: jobId, quoteId } = req.params
    const { scheduledDate, scheduledTime, location } = req.body

    // Verify job ownership
    const jobResult = await pool.query(
      `SELECT * FROM job_posts WHERE id = $1 AND customer_id = $2`,
      [jobId, req.user.id]
    )
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job post not found.' })
    }
    if (!['open', 'quoted'].includes(jobResult.rows[0].status)) {
      return res.status(400).json({ error: 'This job has already been booked.' })
    }

    // Get the quote
    const quoteResult = await pool.query(
      `SELECT * FROM quotes WHERE id = $1 AND job_id = $2 AND status = 'pending'`,
      [quoteId, jobId]
    )
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or already processed.' })
    }

    const quote = quoteResult.rows[0]
    const totalAmount = quote.price * (quote.estimated_hours || 1)

    // Use a transaction so all three operations succeed or all fail together
    // This prevents partial state — e.g. booking created but job not closed
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Create the booking
      const bookingResult = await client.query(
        `INSERT INTO bookings
           (job_id, quote_id, customer_id, artisan_id,
            status, scheduled_date, scheduled_time, location, total_amount)
         VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7, $8)
         RETURNING *`,
        [
          jobId, quoteId, req.user.id, quote.artisan_id,
          scheduledDate || null, scheduledTime || null,
          location || null, totalAmount,
        ]
      )

      // 2. Mark this quote as accepted
      await client.query(
        `UPDATE quotes SET status = 'accepted' WHERE id = $1`,
        [quoteId]
      )

      // 3. Reject all other quotes for this job
      await client.query(
        `UPDATE quotes SET status = 'rejected'
         WHERE job_id = $1 AND id != $2`,
        [jobId, quoteId]
      )

      // 4. Close the job post
      await client.query(
        `UPDATE job_posts SET status = 'booked' WHERE id = $1`,
        [jobId]
      )

      // 5. Create a pending payment record
      await client.query(
        `INSERT INTO payments (booking_id, amount, currency, method, status)
         VALUES ($1, $2, 'XAF', 'mtn_momo', 'pending')`,
        [bookingResult.rows[0].id, totalAmount]
      )

      // 6. Notify the artisan
      const artisanUserResult = await client.query(
        `SELECT user_id FROM artisan_profiles WHERE id = $1`,
        [quote.artisan_id]
      )
      await client.query(
        `INSERT INTO notifications (user_id, type, message)
         VALUES ($1, 'booking', $2)`,
        [
          artisanUserResult.rows[0].user_id,
          `Your quote was accepted for "${jobResult.rows[0].title}". Booking confirmed.`,
        ]
      )

      await client.query('COMMIT')

      res.status(201).json({
        message: 'Quote accepted. Booking confirmed.',
        booking: bookingResult.rows[0],
      })

    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

  } catch (err) {
    next(err)
  }
}

// ── GET /api/customer/bookings ────────────────────────────────────────────────
// Customer views all their bookings with full details
const getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query

    let query = `
      SELECT
        b.id, b.status, b.scheduled_date, b.scheduled_time,
        b.location, b.total_amount, b.created_at,
        jp.title AS service_title, jp.description AS service_description,
        u.full_name AS artisan_name, u.avatar_initials, u.phone AS artisan_phone,
        u.quarter AS artisan_quarter,
        ap.trust_score, ap.avg_rating,
        p.status AS payment_status,
        -- Review if it exists
        r.stars AS review_stars, r.comment AS review_comment
      FROM bookings b
      JOIN job_posts jp ON b.job_id = jp.id
      JOIN artisan_profiles ap ON b.artisan_id = ap.id
      JOIN users u ON ap.user_id = u.id
      LEFT JOIN payments p ON p.booking_id = b.id
      LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE b.customer_id = $1
    `

    const params = [req.user.id]

    if (status && status !== 'all') {
      query += ` AND b.status = $2`
      params.push(status)
    }

    query += ` ORDER BY b.created_at DESC`

    const result = await pool.query(query, params)

    res.status(200).json({ bookings: result.rows })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/customer/bookings/:id/cancel ────────────────────────────────────
// Customer cancels a scheduled booking — only allowed before it starts
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params

    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND customer_id = $2`,
      [id, req.user.id]
    )

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' })
    }

    const booking = bookingResult.rows[0]

    // Can only cancel a booking that is still confirmed (not yet in-progress)
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        error: `Cannot cancel a booking that is ${booking.status}.`
      })
    }

    await pool.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1`,
      [id]
    )

    // Reopen the job post so other artisans can quote again
    await pool.query(
      `UPDATE job_posts SET status = 'open' WHERE id = $1`,
      [booking.job_id]
    )

    // Notify the artisan
    const artisanUserResult = await pool.query(
      `SELECT user_id FROM artisan_profiles WHERE id = $1`,
      [booking.artisan_id]
    )
    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'booking', 'A booking was cancelled by the customer.')`,
      [artisanUserResult.rows[0].user_id]
    )

    res.status(200).json({ message: 'Booking cancelled successfully.' })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/customer/reviews ────────────────────────────────────────────────
// Customer submits a review after a completed booking
const submitReview = async (req, res, next) => {
  try {
    const { bookingId, stars, comment } = req.body

    if (!bookingId || !stars) {
      return res.status(400).json({ error: 'Booking ID and star rating are required.' })
    }
    if (stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Stars must be between 1 and 5.' })
    }

    // Confirm booking belongs to this customer and is completed
    const bookingResult = await pool.query(
      `SELECT * FROM bookings
       WHERE id = $1 AND customer_id = $2 AND status = 'completed'`,
      [bookingId, req.user.id]
    )
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Booking not found or not yet completed.'
      })
    }

    const booking = bookingResult.rows[0]

    // Prevent duplicate reviews
    const existingReview = await pool.query(
      `SELECT id FROM reviews WHERE booking_id = $1`,
      [bookingId]
    )
    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this booking.' })
    }

    // Insert review
    await pool.query(
      `INSERT INTO reviews (booking_id, customer_id, artisan_id, stars, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [bookingId, req.user.id, booking.artisan_id, stars, comment || null]
    )

    // Recalculate artisan's average rating in artisan_profiles
    await pool.query(
      `UPDATE artisan_profiles
       SET avg_rating = (
         SELECT AVG(stars) FROM reviews WHERE artisan_id = $1
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [booking.artisan_id]
    )

    // Recalculate trust score — rating change affects the score
    const { updateTrustScore } = require('../utils/trustScore')
    await updateTrustScore(pool, booking.artisan_id)

    // Notify artisan
    const artisanUserResult = await pool.query(
      `SELECT user_id FROM artisan_profiles WHERE id = $1`,
      [booking.artisan_id]
    )
    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'review', $2)`,
      [
        artisanUserResult.rows[0].user_id,
        `You received a ${stars}-star review. ${comment ? '"' + comment + '"' : ''}`,
      ]
    )

    res.status(201).json({ message: 'Review submitted successfully.' })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/customer/notifications ──────────────────────────────────────────
// Fetch notifications for the logged-in user (works for all roles)
const getNotifications = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    )

    const unreadCount = result.rows.filter(n => !n.is_read).length

    res.status(200).json({
      notifications: result.rows,
      unreadCount,
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/customer/notifications/read ────────────────────────────────────
// Mark all notifications as read
const markNotificationsRead = async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    )
    res.status(200).json({ message: 'All notifications marked as read.' })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getCustomerDashboard,
  createJobPost,
  getMyJobPosts,
  getQuotesForJob,
  acceptQuote,
  getMyBookings,
  cancelBooking,
  submitReview,
  getNotifications,
  markNotificationsRead,
}