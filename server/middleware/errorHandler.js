// Central error handler — add app.use(errorHandler) as the last middleware
// in server/index.js so all thrown errors land here instead of crashing
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.stack}`)

  const statusCode = err.statusCode || 500
  const message    = err.message    || 'Internal server error'

  res.status(statusCode).json({
    error:   message,
    // Only show stack trace in development — never in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

module.exports = errorHandler