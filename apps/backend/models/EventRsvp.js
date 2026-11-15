const { Schema, model } = require('mongoose')

const rsvpSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

rsvpSchema.index({ organizationId: 1, eventId: 1, userId: 1 }, { unique: true })

module.exports = model('EventRsvp', rsvpSchema)
