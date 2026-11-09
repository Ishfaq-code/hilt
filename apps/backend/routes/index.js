const express = require('express')

const auth = require('./auth')
const clubs = require('./clubs')
const membership = require('./membership')
const applications = require('./applications')
const administration = require('./administration')

const router = express.Router()

router.use('/auth', auth)

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
router.use(express.json({ limit: '16kb' }))

router.use(clubs)
router.use(membership)
router.use('/club-applications', applications)
router.use('/admin/club-applications', administration)

module.exports = router
