const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const test = require('node:test')
const mongoose = require('mongoose')
const User = require('../models/User')
const { hashPassword } = require('../services/passwordService')
const app = require('../server')

const mongoUri = process.env.HILT_TEST_MONGODB_URI

test(
  'the account API saves profile details and verifies the current password before changing it',
  {
    skip: !mongoUri,
  },
  async (t) => {
    process.env.JWT_SECRET = randomUUID()
    await mongoose.connect(mongoUri, {
      dbName: 'hilt_account_test_' + randomUUID(),
    })
    t.after(async () => {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    })

    const email = 'account-test@example.edu'
    const oldPassword = 'Original2!'
    const newPassword = 'Replacement3!'
    await User.create({
      email,
      firstName: 'Initial',
      lastName: 'Profile',
      passwordHash: await hashPassword(oldPassword),
    })

    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const origin = 'http://127.0.0.1:' + server.address().port

    function login(password) {
      return fetch(origin + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    }

    const { token } = await (await login(oldPassword)).json()
    assert.ok(token)
    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    }
    const profileUrl = origin + '/api/users/me'
    const patch = (body) =>
      fetch(profileUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })

    assert.equal(
      (await patch({ firstName: 'Updated', phoneNumber: '4075550100' })).status,
      200,
    )
    const profile = await (await fetch(profileUrl, { headers })).json()
    assert.equal(profile.firstName, 'Updated')
    assert.equal(profile.phoneNumber, '4075550100')
    assert.equal((await patch({ password: newPassword })).status, 400)
    assert.equal(
      (await patch({ password: newPassword, currentPassword: 'incorrect' }))
        .status,
      400,
    )
    assert.equal(
      (await patch({ password: newPassword, currentPassword: oldPassword }))
        .status,
      200,
    )
    assert.equal((await login(oldPassword)).status, 401)
    assert.equal((await login(newPassword)).status, 200)
  },
)
