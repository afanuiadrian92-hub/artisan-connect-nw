const express = require('express')
const router  = express.Router()
const { analyzeJob, getArtisanBlurb } = require('../controllers/aiController')
const { verifyToken } = require('../middleware/auth')

// Both routes require authentication — prevents API abuse
router.use(verifyToken)

// POST /api/ai/analyze-job
// Body: { "text": "I need somebody wey go fix my pipe" }
router.post('/analyze-job',   analyzeJob)

// POST /api/ai/artisan-blurb
// Body: { "artisanId": 1 }
router.post('/artisan-blurb', getArtisanBlurb)

module.exports = router