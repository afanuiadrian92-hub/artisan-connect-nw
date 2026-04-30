const express = require('express')
const router  = express.Router()
const {
  searchArtisans, getArtisanById, getArtisanDashboard,
  updateProfile, updateAvailability,
  addService, updateService, deleteService,
  uploadDocument, getDocuments,
  getRecommended,
} = require('../controllers/artisanController')
const { verifyToken, requireRole } = require('../middleware/auth')
const { uploadDocument: multerDoc } = require('../config/cloudinary')

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/',              searchArtisans)   // GET /api/artisans
router.get('/recommended',   getRecommended)   // GET /api/artisans/recommended
router.get('/:id',           getArtisanById)   // GET /api/artisans/:id

// ── Protected artisan-only routes ─────────────────────────────────────────────
// All routes below require a valid JWT with role = 'artisan'
router.use(verifyToken, requireRole('artisan'))

router.get   ('/artisan/dashboard',      getArtisanDashboard) // GET  /api/artisans/artisan/dashboard
router.patch ('/artisan/profile',        updateProfile)       // PATCH
router.patch ('/artisan/availability',   updateAvailability)  // PATCH
router.get   ('/artisan/documents',      getDocuments)        // GET
router.post  ('/artisan/documents',      multerDoc.single('document'), uploadDocument) // POST with file
router.post  ('/artisan/services',       addService)          // POST
router.patch ('/artisan/services/:id',   updateService)       // PATCH
router.delete('/artisan/services/:id',   deleteService)       // DELETE

module.exports = router