const mongoose = require('mongoose')

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    description: {
      type: String,
      trim: true,
      default: '',
    },

    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    links: [{ type: String }],
    administrators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    revision: {
      type: Number,
      default: 0,
    },

    reviews: [{
      _id: false,
      decision: {
        type: String,
        enum: ['approve', 'reject', 'request_changes'],
        required: true,
      },
      message: {
        type: String,
        default: '',
      },
      actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      at: {
        type: Date,
        required: true,
      },
      revision: {
        type: Number,
        required: true,
      },
    }],
  },
  { timestamps: true },
)

organizationSchema.index({ approvalStatus: 1, university: 1, name: 1, _id: 1 })
organizationSchema.index({ owner: 1, createdAt: -1 })
organizationSchema.index({ members: 1, approvalStatus: 1 })

module.exports = mongoose.model('Organization', organizationSchema)
