const mongoose = require('mongoose')

const mobileSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  version: { type: Number, required: true },
  refreshHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})

module.exports = mongoose.model('MobileSession', mobileSessionSchema)
