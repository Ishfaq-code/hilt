const { Schema, model } = require('mongoose')

const clubReportSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clubName: { type: String, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
)

module.exports = model('ClubReport', clubReportSchema)
