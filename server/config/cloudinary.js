const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')
require('dotenv').config()

// Configure Cloudinary with credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Document storage ──────────────────────────────────────────────────────────
// Artisan verification documents go into a dedicated folder
// Allowed formats: PDF and common image types
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'trustlink/documents',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
    resource_type:  'auto', // handles both images and PDFs
    // Unique filename using artisan id + timestamp
    public_id: (req, file) =>
      `doc_${req.user.id}_${Date.now()}`,
  },
})

// ── Portfolio image storage ───────────────────────────────────────────────────
// Artisan portfolio/work photos go into a separate folder
const portfolioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'trustlink/portfolio',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type:   'image',
    transformation:  [{ width: 800, crop: 'limit', quality: 'auto' }],
    public_id: (req, file) =>
      `portfolio_${req.user.id}_${Date.now()}`,
  },
})

// Multer instances — used as route middleware
const uploadDocument  = multer({ storage: documentStorage })
const uploadPortfolio = multer({ storage: portfolioStorage })

module.exports = { cloudinary, uploadDocument, uploadPortfolio }