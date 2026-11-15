const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Organization = require('../models/Organization')
const User = require('../models/User')
const app = require('../server')

const mongoUri = process.env.HILT_TEST_MONGODB_URI

test(
  'club tags survive application approval and club settings edits',
  {
    skip: !mongoUri,
  },
  async (t) => {
    process.env.JWT_SECRET = randomUUID()
    await mongoose.connect(mongoUri, {
      dbName: 'hilt_tags_test_' + randomUUID(),
    })
    t.after(async () => {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    })

    const [applicant, admin] = await User.create([
      {
        firstName: 'Club',
        lastName: 'Applicant',
        email: 'applicant@example.edu',
      },
      {
        firstName: 'Site',
        lastName: 'Admin',
        email: 'admin@example.edu',
        appRole: 'admin',
      },
    ])
    await Organization.create({ name: 'Existing club', category: 'Outdoors' })

    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const origin = 'http://127.0.0.1:' + server.address().port

    async function call(path, user, method = 'GET', body) {
      const headers = { 'Content-Type': 'application/json' }
      if (user)
        headers.Authorization =
          'Bearer ' + jwt.sign({}, process.env.JWT_SECRET, { subject: user.id })
      const response = await fetch(origin + '/api' + path, {
        method,
        body: JSON.stringify(body),
        headers,
      })
      return { status: response.status, data: await response.json() }
    }

    const rejected = await call('/applications', applicant, 'POST', {
      organizationName: 'Tagged club',
      tags: 'Technology',
    })
    assert.equal(rejected.status, 400)

    const application = await call('/applications', applicant, 'POST', {
      organizationName: 'Tagged club',
      tags: [' Technology ', 'Arts', 'technology'],
    })
    assert.equal(application.status, 201)
    assert.deepEqual(application.data.tags, ['Technology', 'Arts'])

    const approval = await call(
      '/applications/' + application.data._id,
      admin,
      'PATCH',
      { status: 'approved' },
    )
    assert.equal(approval.status, 200)

    const directory = (await call('/organizations')).data
    const tagged = directory.find((club) => club.name === 'Tagged club')
    const existing = directory.find((club) => club.name === 'Existing club')
    assert.deepEqual(tagged.tags, ['Technology', 'Arts'])
    assert.deepEqual(existing.tags, ['Outdoors'])

    const update = await call(
      '/organizations/' + tagged._id,
      applicant,
      'PATCH',
      {
        tags: ['Arts', 'Culture'],
      },
    )
    assert.equal(update.status, 200)
    const members = (await call('/memberships/mine', applicant)).data
    assert.deepEqual(members[0].organizationId.tags, ['Arts', 'Culture'])

    const clubPath = '/organizations/' + existing._id
    const cleared = await call(clubPath, admin, 'PATCH', { tags: [] })
    assert.equal(cleared.status, 200)
    assert.deepEqual((await call(clubPath)).data.tags, [])
  },
)
