const bcrypt = require('bcryptjs')

const saltRounds = 12

async function hashPassword(password) {
  return bcrypt.hash(password, saltRounds)
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}

module.exports = { hashPassword, verifyPassword }
