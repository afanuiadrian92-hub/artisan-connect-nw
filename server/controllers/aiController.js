const { analyzeJobRequest, generateArtisanBlurb } = require('../utils/geminiService')
const pool = require('../db/pool')

// ── POST /api/ai/analyze-job ──────────────────────────────────────────────────
// Accepts raw natural language job description.
// Returns structured data to auto-fill the job posting form.
// Works for plain English and Cameroon Pidgin English.
const analyzeJob = async (req, res, next) => {
  try {
    const { text } = req.body

    if (!text || text.trim().length < 5) {
      return res.status(400).json({
        error: 'Please provide a description of at least 5 characters.'
      })
    }

    if (text.length > 500) {
      return res.status(400).json({
        error: 'Description must be under 500 characters.'
      })
    }

    const result = await analyzeJobRequest(text.trim())

    if (!result.success) {
      return res.status(422).json({
        error:   result.error,
        fallback: true,
      })
    }

    // Log AI usage for analytics — helps demonstrate platform usage in thesis
    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'system', $2)`,
      [
        req.user.id,
        `AI job analysis used — detected: ${result.categoryName} (${result.detectedLanguage}, confidence: ${Math.round(result.confidence * 100)}%)`,
      ]
    ).catch(() => {}) // Non-critical — don't fail the request if logging fails

    res.status(200).json({
      message:  'Job request analyzed successfully.',
      analysis: result,
    })

  } catch (err) {
    // If Gemini API is unavailable, return graceful fallback
    // Frontend will show manual form entry instead of crashing
    if (err.message?.includes('API key') || err.message?.includes('quota')) {
      return res.status(503).json({
        error:    'AI service temporarily unavailable. Please fill the form manually.',
        fallback: true,
      })
    }
    next(err)
  }
}

// ── POST /api/ai/artisan-blurb ────────────────────────────────────────────────
// Generates recommendation text for new artisans on the search/dashboard pages.
// Called when an artisan has fewer than 5 completed jobs (cold-start scenario).
const getArtisanBlurb = async (req, res, next) => {
  try {
    const { artisanId } = req.body

    if (!artisanId) {
      return res.status(400).json({ error: 'Artisan ID is required.' })
    }

    // Fetch artisan details needed to generate the blurb
    const result = await pool.query(
      `SELECT
         u.full_name, u.quarter,
         ap.trust_score, ap.total_jobs,
         (SELECT sc.name FROM artisan_services asv
          JOIN service_categories sc ON asv.category_id = sc.id
          WHERE asv.artisan_id = ap.id LIMIT 1) AS primary_service,
         (SELECT COUNT(*) FROM verification_documents
          WHERE artisan_id = ap.id AND status = 'verified') AS verified_doc_count
       FROM artisan_profiles ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.id = $1`,
      [artisanId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan not found.' })
    }

    const artisan = result.rows[0]

    // Only generate AI blurb for new artisans — established ones
    // have ratings and reviews that speak for themselves
    if (parseInt(artisan.total_jobs) >= 5) {
      return res.status(200).json({
        blurb:     null,
        reason:    'Artisan has sufficient reviews — no AI blurb needed.',
        useReviews: true,
      })
    }

    const blurb = await generateArtisanBlurb({
      fullName:        artisan.full_name,
      primaryService:  artisan.primary_service || 'General Services',
      quarter:         artisan.quarter,
      trustScore:      artisan.trust_score,
      verifiedDocCount: parseInt(artisan.verified_doc_count),
    })

    res.status(200).json({
      blurb:          blurb.blurb,
      isAiGenerated:  blurb.success,
      artisanId,
    })

  } catch (err) {
    next(err)
  }
}

module.exports = { analyzeJob, getArtisanBlurb }