const express = require('express')
const mongoose = require('mongoose')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

module.exports = router
