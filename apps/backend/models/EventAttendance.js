const { Schema, model } = require('mongoose')

const attendanceSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  checkedInAt: { type: Date, required: true },
  checkedInBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  method: {
    type: String,
    enum: ['self', 'event-qr', 'staff-manual', 'attendee-qr'],
    required: true,
  },
  hadRsvp: { type: Boolean, required: true },
  reversedAt: Date,
  reversedBy: { type: Schema.Types.ObjectId, ref: 'User' },
})

attendanceSchema.index(
  { organizationId: 1, eventId: 1, userId: 1 },
  { unique: true },
)

module.exports = model('EventAttendance', attendanceSchema)
