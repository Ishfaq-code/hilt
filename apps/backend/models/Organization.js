const mongoose = require('mongoose')

const assetSchema = new mongoose.Schema(
  {
    type: {
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

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    startDatetime: {
      type: Date,
      required: true,
    },
    endDatetime: {
      type: Date,
      required: true,
    },
    place: { type: String, default: null, trim: true },
    type: { type: String, default: 'Meeting', trim: true },
    private: { type: Boolean, default: false },
    banner: { type: String, default: null, trim: true },
    attendance: {
      enabled: { type: Boolean, default: false },
      self: { type: Boolean, default: false },
      eventQr: { type: Boolean, default: false },
      attendeeQr: { type: Boolean, default: false },
      walkIns: { type: Boolean, default: false },
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    category: { type: String, default: 'General', trim: true },
    profile: { type: String, default: null, trim: true },
    assets: {
      type: [assetSchema],
      default: [],
    },
    membershipFee: {
      type: Number,
      default: 0,
    },
    events: {
      type: [eventSchema],
      default: [],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

module.exports = mongoose.model('Organization', organizationSchema)
