const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const morgan       = require('morgan')
const artisanRoutes = require('./routes/artisans')
require('dotenv').config()

// Import database pool — establishes connection on startup
require('./db/pool')

const authRoutes   = require('./routes/auth')
const errorHandler = require('./middleware/errorHandler')
const customerRoutes = require('./routes/customer')
const quoteRoutes    = require('./routes/quotes')

const app = express()

// ── Security and logging middleware ──────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(morgan('dev'))
app.use(express.json())

// ── API routes ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TrustLink API is running' })
})

app.use('/api/auth', authRoutes)
// add this line after app.use('/api/auth', authRoutes)
app.use('/api/artisans', artisanRoutes)

app.use('/api/customer', customerRoutes)
app.use('/api/quotes',   quoteRoutes)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` })
})

// ── Central error handler — must be last ─────────────────────────────────────
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`TrustLink API running on port ${PORT}`)
})