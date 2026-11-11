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
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Organization', organizationSchema)
