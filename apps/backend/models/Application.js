const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    organizationDescription: {
      type: String,
      default: null,
      trim: true,
    },
    additionalDocuments: {
      type: [documentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

module.exports = mongoose.model('Application', applicationSchema)
