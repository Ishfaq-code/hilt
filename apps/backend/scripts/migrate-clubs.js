require('dotenv').config()

const mongoose = require('mongoose')

const Organization = require('../models/Organization')
const University = require('../models/University')
const User = require('../models/User')

async function migrateLegacyClubs(university, apply) {
  let migrated = 0
  let eligible = 0
  let skipped = 0

  // Raw reads distinguish absent stored fields from Mongoose defaults.
  const candidates = Organization.collection.find({
    approvalStatus: { $exists: false },
  })

  for await (const club of candidates) {
    const owner = await User.findById(club.owner)

    if (!owner || !university.emailDomains.includes(owner.emailAddress.split('@')[1])) {
      skipped += 1
      continue
    }

    eligible += 1

    if (apply) {
      const result = await Organization.collection.updateOne(
        { _id: club._id, approvalStatus: { $exists: false } },
        {
          $set: {
            university: university._id,
            approvalStatus: 'pending',
            contactEmail: owner.emailAddress,
            links: [],
            administrators: [],
            reviews: [],
            revision: 0,
          },
        },
      )

      migrated += result.modifiedCount
    }
  }

  return {
    dryRun: !apply,
    eligible,
    migrated,
    skipped,
    note: 'Original IDs, owners, names, descriptions, members, and user accounts are preserved. Migrated clubs require review.',
  }
}

async function main() {
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--university')
  const unknownArgument = args.some((arg, index) => (
    !['--apply', '--university'].includes(arg) && index !== slugIndex + 1
  ))

  if (slugIndex < 0 || !args[slugIndex + 1] || unknownArgument) {
    throw new Error(
      'Usage: npm run migrate:clubs -- --university ucf [--apply]. Without --apply this reports candidates only.',
    )
  }

  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HiltDB',
    { autoIndex: false, autoCreate: false },
  )

  const university = await University.findOne({ slug: args[slugIndex + 1] })

  if (!university) {
    throw new Error('Unknown university. Start the API/configure the university before migration.')
  }

  const result = await migrateLegacyClubs(university, args.includes('--apply'))

  console.log(JSON.stringify(result))
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
    .finally(() => mongoose.disconnect())
}

module.exports = { migrateLegacyClubs }
