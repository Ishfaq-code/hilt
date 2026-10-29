const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Existing seed users have no password and cannot sign in until one is set.
    passwordHash: {
      type: String,
      select: false,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('User', userSchema)
