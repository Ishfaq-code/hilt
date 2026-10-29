const assert = require('node:assert/strict')
const { randomUUID, createHash } = require('node:crypto')
const { once } = require('node:events')
const { test } = require('node:test')
const mongoose = require('mongoose')
const argon2 = require('argon2')
const app = require('../server')
const User = require('../models/User')
const Session = require('../models/Session')

test('authentication API against MongoDB', async (t) => {
  // Always use an isolated database, even if the URI names an existing database.
  const dbName = `hilt_auth_test_${randomUUID().replaceAll('-', '')}`
  let server
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve))
    if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  })

  await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017', {
    dbName,
    serverSelectionTimeoutMS: 5000,
  })
  await Promise.all([User.init(), Session.init()])
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const account = {
    firstName: 'Alex',
    lastName: 'Student',
    emailAddress: 'alex@example.com',
    password: 'a long checkpoint passphrase',
  }

  async function request(path, { body, token, method = 'POST', headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null }
  }

  let userId
  let token
  await t.test('registers a normalized account, hashes its password, and returns only safe fields', async () => {
    const result = await request('/api/auth/register', {
      body: { ...account, firstName: ' Alex ', emailAddress: ' ALEX@EXAMPLE.COM ', passwordHash: 'injected', role: 'admin' },
    })
    assert.equal(result.status, 201)
    assert.equal(result.headers.get('cache-control'), 'no-store')
    userId = result.body.user.id
    assert.deepEqual(result.body, {
      user: { id: userId, firstName: 'Alex', lastName: 'Student', emailAddress: account.emailAddress },
    })
    const saved = await User.findById(userId).select('+passwordHash').lean()
    assert.match(saved.passwordHash, /^\$argon2id\$/)
    assert.equal(await argon2.verify(saved.passwordHash, account.password), true)
    assert.equal(saved.password, undefined)
    assert.equal(saved.role, undefined)
    assert.equal((await User.findById(userId)).passwordHash, undefined)
  })

  await t.test('rejects duplicate emails without overwriting the existing account', async () => {
    const result = await request('/api/auth/register', { body: { ...account, emailAddress: 'ALEX@example.com' } })
    assert.equal(result.status, 409)
    assert.equal(await User.countDocuments({ emailAddress: account.emailAddress }), 1)
    assert.equal((await User.findOne({ emailAddress: account.emailAddress })).id, userId)
  })

  await t.test('allows only one account when duplicate registrations race', async () => {
    const body = { ...account, emailAddress: 'race@example.com' }
    const results = await Promise.all([
      request('/api/auth/register', { body }),
      request('/api/auth/register', { body }),
    ])
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409])
    assert.equal(await User.countDocuments({ emailAddress: body.emailAddress }), 1)
  })

  await t.test('rejects missing, malformed, oversized, and operator-shaped fields', async () => {
    for (const body of [
      {},
      { ...account, firstName: ' ' },
      { ...account, lastName: 'x'.repeat(101) },
      { ...account, emailAddress: 'not-an-email' },
      { ...account, emailAddress: { $ne: null } },
      { ...account, password: { $gt: '' } },
      { ...account, password: 'too short' },
      { ...account, password: 'x'.repeat(129) },
    ]) {
      const result = await request('/api/auth/register', { body })
      assert.equal(result.status, 400)
      assert.equal(typeof result.body.error, 'string')
    }
    assert.equal(await User.countDocuments(), 2)
  })

  await t.test('returns JSON errors for malformed JSON, large bodies, and wrong media types', async () => {
    const malformed = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    })
    assert.equal(malformed.status, 400)
    assert.deepEqual(await malformed.json(), { error: 'The request body must be valid JSON.' })
    const oversized = await request('/api/auth/register', { body: { padding: 'x'.repeat(9000) } })
    assert.equal(oversized.status, 413)
    const wrongType = await request('/api/auth/register', { body: account, headers: { 'Content-Type': 'text/plain' } })
    assert.equal(wrongType.status, 415)
  })

  await t.test('logs in case-insensitively and stores only a digest of the expiring token', async () => {
    const result = await request('/api/auth/login', { body: { ...account, emailAddress: ' ALEX@example.com ' } })
    assert.equal(result.status, 200)
    assert.equal(result.headers.get('cache-control'), 'no-store')
    assert.equal(result.body.user.id, userId)
    assert.equal(result.body.tokenType, 'Bearer')
    assert.equal(result.body.user.passwordHash, undefined)
    token = result.body.token
    assert.match(token, /^[a-f0-9]{64}$/)
    const expiresIn = new Date(result.body.expiresAt).getTime() - Date.now()
    assert.ok(expiresIn > 23 * 60 * 60 * 1000 && expiresIn <= 24 * 60 * 60 * 1000)
    const saved = await Session.findOne({ user: userId }).select('+tokenHash').lean()
    assert.equal(saved.tokenHash, createHash('sha256').update(token).digest('hex'))
    assert.equal(JSON.stringify(saved).includes(token), false)
  })

  await t.test('rejects wrong passwords, unknown users, and legacy users identically', async () => {
    const legacy = await User.create({ firstName: 'Legacy', lastName: 'User', emailAddress: 'legacy@example.com' })
    for (const emailAddress of [account.emailAddress, 'missing@example.com', legacy.emailAddress]) {
      const result = await request('/api/auth/login', { body: { emailAddress, password: 'incorrect password' } })
      assert.equal(result.status, 401)
      assert.deepEqual(result.body, { error: 'Invalid email address or password.' })
    }
    const duplicate = await request('/api/auth/register', { body: { ...account, emailAddress: legacy.emailAddress } })
    assert.equal(duplicate.status, 409)
    assert.equal((await User.findById(legacy.id).select('+passwordHash')).passwordHash, undefined)
  })

  await t.test('rejects login injection and invalid field types before querying MongoDB', async () => {
    for (const body of [{}, { emailAddress: { $ne: null }, password: account.password }, { ...account, password: [] }]) {
      assert.equal((await request('/api/auth/login', { body })).status, 400)
    }
  })

  await t.test('preserves password whitespace and Unicode without truncation', async () => {
    const unicodeAccount = { ...account, emailAddress: 'unicode@example.com', password: ` ${'🔐'.repeat(15)} ` }
    assert.equal((await request('/api/auth/register', { body: unicodeAccount })).status, 201)
    assert.equal((await request('/api/auth/login', { body: unicodeAccount })).status, 200)
    assert.equal((await request('/api/auth/login', { body: { ...unicodeAccount, password: unicodeAccount.password.trim() } })).status, 401)
  })

  await t.test('resolves the logged-in user using a Bearer token', async () => {
    const result = await request('/api/auth/me', { method: 'GET', token })
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { user: { id: userId, firstName: 'Alex', lastName: 'Student', emailAddress: account.emailAddress } })
    assert.equal(result.headers.get('cache-control'), 'no-store')
  })

  await t.test('rejects missing, malformed, and unknown tokens', async () => {
    for (const invalidToken of [undefined, 'malformed', '0'.repeat(64)]) {
      assert.equal((await request('/api/auth/me', { method: 'GET', token: invalidToken })).status, 401)
    }
    assert.equal((await request('/api/auth/logout')).status, 401)
  })

  await t.test('rejects expired sessions before MongoDB TTL cleanup', async () => {
    const login = await request('/api/auth/login', { body: account })
    const expiredToken = login.body.token
    const tokenHash = createHash('sha256').update(expiredToken).digest('hex')
    await Session.updateOne({ tokenHash }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
    assert.equal((await request('/api/auth/me', { method: 'GET', token: expiredToken })).status, 401)
  })

  await t.test('revokes only the session being logged out', async () => {
    const secondLogin = await request('/api/auth/login', { body: account })
    assert.notEqual(secondLogin.body.token, token)
    const logout = await request('/api/auth/logout', { token })
    assert.equal(logout.status, 204)
    assert.equal(logout.body, null)
    assert.equal((await request('/api/auth/me', { method: 'GET', token })).status, 401)
    assert.equal((await request('/api/auth/me', { method: 'GET', token: secondLogin.body.token })).status, 200)
  })

  await t.test('rejects a session whose user no longer exists', async () => {
    const login = await request('/api/auth/login', { body: { ...account, emailAddress: 'race@example.com' } })
    await User.deleteOne({ emailAddress: 'race@example.com' })
    assert.equal((await request('/api/auth/me', { method: 'GET', token: login.body.token })).status, 401)
  })

  await t.test('limits repeated login and registration attempts with JSON and Retry-After', async () => {
    for (const path of ['/api/auth/login', '/api/auth/register']) {
      let result
      for (let attempt = 0; attempt < 21; attempt += 1) {
        result = await request(path, { body: {} })
        if (result.status === 429) break
      }
      assert.equal(result.status, 429)
      assert.ok(Number(result.headers.get('retry-after')) > 0)
      assert.equal(typeof result.body.error, 'string')
    }
  })

  await t.test('keeps the existing health response intact', async () => {
    const result = await request('/api/health', { method: 'GET' })
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { status: 'ok', mongodb: 'connected' })
  })
})
