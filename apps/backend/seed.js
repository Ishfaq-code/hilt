require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env') })

const mongoose = require('mongoose')
const User = require('./models/User')
const passwordService = require('./services/passwordService')
const passwordValidationService = require('./services/passwordValidationService')

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const firstName = process.env.ADMIN_FIRST_NAME?.trim()
  const lastName = process.env.ADMIN_LAST_NAME?.trim()
  const password = process.env.ADMIN_PASSWORD
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HiltDB'

  if (!email) throw new Error('ADMIN_EMAIL must be set.')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address.')
  if (!firstName || !lastName) throw new Error('ADMIN_FIRST_NAME and ADMIN_LAST_NAME must be set.')
  if (!passwordValidationService.isValid(password)) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters and include a number and a symbol.')
  }

  await mongoose.connect(mongoUri)
  const existingUser = await User.findOne({ email })

  if (existingUser) {
    existingUser.appRole = 'admin'
    await existingUser.save()
    console.log(`Promoted ${email} to admin. Existing account details and password were preserved.`)
    return
  }

  const passwordHash = await passwordService.hashPassword(password)
  await User.create({ firstName, lastName, email, passwordHash, appRole: 'admin' })
  console.log(`Created admin account for ${email}.`)
}

seedAdmin()
  .catch((error) => {
    console.error(`Admin seed failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  })
