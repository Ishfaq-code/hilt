const mongoose = require('mongoose')

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    organizationRole: {
      type: String,
      enum: ['student', 'officer', 'owner'],
      default: 'student',
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true })

module.exports = mongoose.model('Membership', membershipSchema)
