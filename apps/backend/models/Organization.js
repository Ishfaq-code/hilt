const mongoose = require('mongoose')
const { serializeTags } = require('../services/clubTags')

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
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    startDatetime: {
      type: Date,
      default: null,
    },
    endDatetime: {
      type: Date,
      default: null,
    },
    place: { type: String, default: null, trim: true },
    type: { type: String, default: 'Meeting', trim: true },
    private: { type: Boolean, default: false },
    banner: { type: String, default: null, trim: true },
    draftSchedule: {
      date: String,
      startTime: String,
      endTime: String,
    },
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
    category: { type: String, trim: true },
    tags: { type: [String], default: undefined },
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
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: serializeTags },
    toObject: { virtuals: true },
  },
)

module.exports = mongoose.model('Organization', organizationSchema)
