require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const User = require('./models/User')
const Membership = require('./models/Membership')

const app = express()
const port = process.env.PORT || 3000
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HiltDB'

app.disable('x-powered-by')

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body must be valid JSON.' })
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request body is too large.' })
  }
  if (error.status === 415) {
    return res.status(415).json({ error: 'The request encoding is not supported.' })
  }
  // Do not log request bodies or database errors containing credential material.
  console.error('Request failed:', error.name)
  res.status(500).json({ error: 'An unexpected server error occurred.' })
})

async function start() {
  await mongoose.connect(mongoUri)
  await Promise.all([User.init(), Membership.init()])
  console.log('Connected to MongoDB')

  app.listen(port, '0.0.0.0', () => {
    console.log(`Express server listening on port ${port}`)
  })
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

module.exports = app
