// ── Trust Score Formula ───────────────────────────────────────────────────────
// Score = (verificationLevel × 30) + (avgRating × 8) + (jobScore × 20) + (responseRate × 10)
// Maximum possible score = 30 + 40 + 20 + 10 = 100
//
// This is a transparent, explainable formula — no black box.
// Cite this in your thesis methodology chapter as a
// "weighted multi-factor trust index adapted for informal labour markets."

const calculateTrustScore = ({
  verifiedDocCount = 0,   // number of approved documents
  totalDocCount    = 0,   // total documents submitted
  avgRating        = 0,   // 0–5 scale
  totalJobs        = 0,   // completed jobs
  responseRate     = 100, // percentage 0–100
}) => {

  // ── Verification level (0–1 scale, max 30 points) ─────────────────────────
  // 0 docs verified = 0, all docs verified = 1
  const verificationLevel = totalDocCount > 0
    ? verifiedDocCount / totalDocCount
    : 0
  const verificationScore = Math.round(verificationLevel * 30)

  // ── Rating score (max 40 points) ──────────────────────────────────────────
  // avgRating is 0–5, scaled to 0–40
  const ratingScore = Math.round((avgRating / 5) * 40)

  // ── Jobs completed score (max 20 points) ──────────────────────────────────
  // Caps at 50 jobs — after that the artisan gets full marks
  const jobScore = Math.round(Math.min(totalJobs / 50, 1) * 20)

  // ── Response rate score (max 10 points) ───────────────────────────────────
  const responseScore = Math.round((responseRate / 100) * 10)

  const total = verificationScore + ratingScore + jobScore + responseScore

  return {
    total:             Math.min(total, 100), // hard cap at 100
    breakdown: {
      verification:  verificationScore,
      rating:        ratingScore,
      jobs:          jobScore,
      responseRate:  responseScore,
    },
  }
}

// ── Recalculate and persist trust score to DB ─────────────────────────────────
// Called after: document verified/rejected, review submitted, job completed
const updateTrustScore = async (pool, artisanProfileId) => {
  // Fetch all inputs needed for calculation
  const [docResult, profileResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'verified') AS verified_count,
         COUNT(*) AS total_count
       FROM verification_documents
       WHERE artisan_id = $1`,
      [artisanProfileId]
    ),
    pool.query(
      `SELECT avg_rating, total_jobs, response_rate
       FROM artisan_profiles WHERE id = $1`,
      [artisanProfileId]
    ),
  ])

  const { verified_count, total_count } = docResult.rows[0]
  const { avg_rating, total_jobs, response_rate } = profileResult.rows[0]

  const { total } = calculateTrustScore({
    verifiedDocCount: parseInt(verified_count),
    totalDocCount:    parseInt(total_count),
    avgRating:        parseFloat(avg_rating) || 0,
    totalJobs:        parseInt(total_jobs)   || 0,
    responseRate:     parseInt(response_rate)|| 100,
  })

  // Persist the new score
  await pool.query(
    `UPDATE artisan_profiles SET trust_score = $1, updated_at = NOW()
     WHERE id = $2`,
    [total, artisanProfileId]
  )

  return total
}

module.exports = { calculateTrustScore, updateTrustScore }