const mongoose = require('mongoose')

const universitySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emailDomains: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
  },
  { timestamps: true },
)

module.exports = mongoose.model('University', universitySchema)
