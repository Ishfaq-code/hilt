const mongoose = require('mongoose')

const pendingRegistrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema)
