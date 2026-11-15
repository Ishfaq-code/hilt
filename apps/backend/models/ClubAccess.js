const { Schema, model } = require('mongoose')

const roleSchema = new Schema({
  name: { type: String, required: true },
  permissions: [String],
  maxMembers: { type: Number, default: null },
  memberIds: [Schema.Types.ObjectId],
})

const accessSchema = new Schema({
  roles: [roleSchema],
  departures: [Schema.Types.ObjectId],
  revision: { type: Number, default: 0 },
  history: [Schema.Types.Mixed],
})

module.exports = model('ClubAccess', accessSchema)
