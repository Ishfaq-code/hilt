const mongoose = require('mongoose')
const { withClubTags } = require('../services/tags')

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
    category: { type: String, trim: true },
    tags: { type: [String], default: undefined },
    contactEmail: { type: String, default: null, trim: true, lowercase: true },
    link: { type: String, default: null, trim: true },
    roleSetup: {
      type: [
        new mongoose.Schema(
          {
            name: String,
            permissions: [String],
            maxMembers: { type: Number, default: null },
            assignApplicant: Boolean,
          },
          { _id: false },
        ),
      ],
      default: undefined,
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
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_document, application) => withClubTags(application),
    },
    toObject: { virtuals: true },
  },
)

module.exports = mongoose.model('Application', applicationSchema)
