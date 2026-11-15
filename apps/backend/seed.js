require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env') })

const mongoose = require('mongoose')
const User = require('./models/User')
const Organization = require('./models/Organization')
const Membership = require('./models/Membership')
const ClubAccess = require('./models/ClubAccess')
const passwordService = require('./services/passwordService')
const passwordValidationService = require('./services/passwordValidationService')

const seededAccounts = [
  { firstName: 'Avery', lastName: 'Morgan', email: 'avery.morgan@example.com' },
  { firstName: 'Jordan', lastName: 'Lee', email: 'jordan.lee@example.com' },
  { firstName: 'Taylor', lastName: 'Rivera', email: 'taylor.rivera@example.com' },
  { firstName: 'Casey', lastName: 'Patel', email: 'casey.patel@example.com' },
  { firstName: 'Riley', lastName: 'Kim', email: 'riley.kim@example.com' },
  { firstName: 'Quinn', lastName: 'Brooks', email: 'quinn.brooks@example.com' },
]

const seededOrganizations = [
  { name: 'Campus Creators', category: 'Arts', description: 'A community for creative projects and showcases.' },
  { name: 'Outdoor Explorers', category: 'Recreation', description: 'Local adventures, hikes, and outdoor skills.' },
  { name: 'Tech Collective', category: 'Technology', description: 'A student community for building with technology.' },
  { name: 'Community Volunteers', category: 'Service', description: 'Connecting members with local volunteer opportunities.' },
]

const allPermissions = [
  'settings',
  'editPages',
  'publishPages',
  'events',
  'members',
  'roles',
  'attendance',
  'communications',
  'integrations',
]

const eventNames = [
  'Community Kickoff',
  'Workshop Night',
  'Member Meetup',
  'Guest Speaker Session',
  'Year-End Social',
  'Open House',
  'Planning Session',
  'Skills Exchange',
]

function shuffled(values) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function createEvents(organizationName) {
  const days = shuffled(Array.from({ length: 31 }, (_, index) => index)).slice(0, 5)

  return days.map((day, index) => {
    const startDatetime = new Date(Date.UTC(2026, 10, 20 + day, 9 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30))
    const durationHours = 1 + Math.floor(Math.random() * 3)

    return {
      name: `${organizationName}: ${eventNames[Math.floor(Math.random() * eventNames.length)]}`,
      status: 'published',
      description: `Join ${organizationName} for an evening of activities and connection.`,
      startDatetime,
      endDatetime: new Date(startDatetime.getTime() + durationHours * 60 * 60 * 1000),
      place: ['Student Center', 'Room 204', 'Community Hall', 'Innovation Lab'][Math.floor(Math.random() * 4)],
      type: ['Social', 'Workshop', 'Meeting', 'Community'][Math.floor(Math.random() * 4)],
      private: false,
      attendance: { enabled: true, self: true, eventQr: false, attendeeQr: false, walkIns: true },
      _seedOrder: index,
    }
  })
}

async function upsertUser(details, appRole, passwordHash) {
  return User.findOneAndUpdate(
    { email: details.email },
    {
      $set: { firstName: details.firstName, lastName: details.lastName, appRole },
      $setOnInsert: { email: details.email, passwordHash },
    },
    { new: true, upsert: true, runValidators: true },
  )
}

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HiltDB'
  const admin = {
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    firstName: process.env.ADMIN_FIRST_NAME?.trim(),
    lastName: process.env.ADMIN_LAST_NAME?.trim(),
  }
  const adminPassword = process.env.ADMIN_PASSWORD
  const seedPassword = process.env.SEED_PASSWORD || 'DemoSeed2026!'

  if (!admin.email) throw new Error('ADMIN_EMAIL must be set.')
  if (!/^\S+@\S+\.\S+$/.test(admin.email)) throw new Error('ADMIN_EMAIL must be a valid email address.')
  if (!admin.firstName || !admin.lastName) throw new Error('ADMIN_FIRST_NAME and ADMIN_LAST_NAME must be set.')
  if (!passwordValidationService.isValid(adminPassword)) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters and include a number and a symbol.')
  }
  if (!passwordValidationService.isValid(seedPassword)) {
    throw new Error('SEED_PASSWORD must be at least 8 characters and include a number and a symbol.')
  }

  await mongoose.connect(mongoUri)

  const [adminHash, seededPasswordHash] = await Promise.all([
    passwordService.hashPassword(adminPassword),
    passwordService.hashPassword(seedPassword),
  ])
  const adminUser = await upsertUser(admin, 'admin', adminHash)
  console.log(`Ensured admin account ${admin.email}.`)

  const users = []
  for (const account of seededAccounts) {
    if (account.email === admin.email) {
      users.push(adminUser)
      continue
    }
    users.push(await upsertUser(account, 'user', seededPasswordHash))
  }

  const organizations = []
  for (const details of seededOrganizations) {
    const events = createEvents(details.name).map(({ _seedOrder, ...event }) => event)
    const organization = await Organization.findOneAndUpdate(
      { name: details.name },
      { $set: { ...details, events } },
      { new: true, upsert: true, runValidators: true },
    )
    organizations.push(organization)
  }

  const seedUserIds = users.map((user) => user._id)
  for (let organizationIndex = 0; organizationIndex < organizations.length; organizationIndex += 1) {
    const organization = organizations[organizationIndex]
    await Membership.deleteMany({ organizationId: organization._id, userId: { $in: seedUserIds } })

    const president = users[organizationIndex]
    const assignedUsers = users.filter((_, userIndex) => userIndex !== organizationIndex)
    const memberships = await Membership.insertMany(
      [president, ...assignedUsers].map((user) => ({
        userId: user._id,
        organizationId: organization._id,
        isPaid: true,
      })),
    )
    const presidentMembership = memberships[0]
    const memberMemberships = memberships.slice(1)

    await ClubAccess.findOneAndUpdate(
      { _id: organization._id },
      {
        $set: {
          roles: [
            { name: 'President', permissions: allPermissions, maxMembers: 1, memberIds: [presidentMembership._id] },
            { name: 'Member', permissions: [], maxMembers: null, memberIds: memberMemberships.map((membership) => membership._id) },
          ],
          departures: [],
          revision: 0,
          history: [],
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )
  }

  console.log(`Seeded ${users.length} accounts, ${organizations.length} organizations, and ${organizations.length * 5} events.`)
  console.log(`Seed account password: ${seedPassword}`)
}

seed()
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  })
