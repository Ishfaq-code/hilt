require('dotenv').config()

const mongoose = require('mongoose')
const User = require('./models/User')
const Organization = require('./models/Organization')

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HiltDB'

async function seed() {
  await mongoose.connect(mongoUri)
  console.log(`Connected to MongoDB database: ${mongoose.connection.name}`)

  const seedUsers = [
    {
      firstName: 'Alex',
      lastName: 'Morgan',
      emailAddress: 'alex.morgan@example.com',
    },
    {
      firstName: 'Jordan',
      lastName: 'Lee',
      emailAddress: 'jordan.lee@example.com',
    },
    {
      firstName: 'Taylor',
      lastName: 'Rivera',
      emailAddress: 'taylor.rivera@example.com',
    },
  ]

  const users = await Promise.all(
    seedUsers.map(({ emailAddress, ...fields }) =>
      User.findOneAndUpdate(
        { emailAddress },
        { $set: { ...fields, emailAddress } },
        { upsert: true, new: true, runValidators: true },
      ),
    ),
  )

  const [owner, ...members] = users

  await Organization.findOneAndUpdate(
    { name: 'Hilt Demo Organization' },
    {
      $set: {
        name: 'Hilt Demo Organization',
        owner: owner._id,
        members: members.map((member) => member._id),
        description: 'A sample organization created by the Hilt seed script.',
      },
    },
    { upsert: true, new: true, runValidators: true },
  )

  console.log(`Seeded ${users.length} users and 1 organization.`)
}

seed()
  .catch((error) => {
    console.error('Database seeding failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
