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
  'mobile sign-in persists and the server can revoke it',
  { skip: !mongoUri },
  async (t) => {
    process.env.JWT_SECRET = randomUUID()
    await mongoose.connect(mongoUri, {
      dbName: 'hilt_mobile_test_' + randomUUID(),
    })
    t.after(async () => {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    })

    const email = 'mobile-test@example.edu'
    const password = 'Original2!'
    await User.create({
      email,
      firstName: 'Test',
      lastName: 'User',
      passwordHash: await hashPassword(password),
    })

    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const origin = 'http://127.0.0.1:' + server.address().port

    function request(path, { method = 'GET', body, token, clientOrigin } = {}) {
      const headers = new Headers()
      if (body) headers.set('Content-Type', 'application/json')
      if (token) headers.set('Authorization', 'Bearer ' + token)
      if (clientOrigin) headers.set('Origin', clientOrigin)
      return fetch(origin + '/api' + path, {
        headers,
        method,
        body: JSON.stringify(body),
      })
    }

    const login = (mobile) =>
      request('/auth/login', {
        method: 'POST',
        body: { email, password, mobile },
      })
    const refresh = (refreshToken) =>
      request('/auth/mobile/refresh', {
        method: 'POST',
        body: { refreshToken },
      })
    const profile = (token) => request('/users/me', { token })

    await t.test(
      'allows API calls from the iOS and Android shells',
      async () => {
        for (const clientOrigin of [
          'capacitor://localhost',
          'https://localhost',
        ]) {
          const preflight = await request('/users/me', {
            method: 'OPTIONS',
            clientOrigin,
          })
          assert.equal(preflight.status, 204)
          assert.equal(
            preflight.headers.get('access-control-allow-origin'),
            clientOrigin,
          )
          assert.match(
            preflight.headers.get('access-control-allow-methods'),
            /\bPUT\b/,
          )
          assert.match(
            preflight.headers.get('access-control-allow-headers'),
            /\bAuthorization\b/,
          )

          const health = await request('/health', { clientOrigin })
          assert.equal(
            health.headers.get('access-control-allow-origin'),
            clientOrigin,
          )
        }
        const unrelated = await request('/health', {
          clientOrigin: 'https://example.edu',
        })
        assert.equal(
          unrelated.headers.has('access-control-allow-origin'),
          false,
        )
      },
    )

    await t.test(
      'refreshes a session once and revokes it on logout',
      async () => {
        const web = await (await login(false)).json()
        assert.ok(web.token)
        assert.equal(web.refreshToken, undefined)

        const loginResponse = await login(true)
        assert.equal(loginResponse.status, 200)
        const mobile = await loginResponse.json()
        assert.equal((await profile(mobile.token)).status, 200)

        const attempts = await Promise.all([
          refresh(mobile.refreshToken),
          refresh(mobile.refreshToken),
        ])
        assert.deepEqual(
          attempts.map((response) => response.status).sort(),
          [200, 401],
        )
        const next = await attempts.find((response) => response.ok).json()
        assert.equal((await profile(next.token)).status, 200)

        const logout = await request('/auth/mobile/logout', {
          method: 'POST',
          body: { refreshToken: next.refreshToken },
        })
        assert.equal(logout.status, 204)
        assert.equal((await profile(next.token)).status, 401)
        assert.equal((await refresh(next.refreshToken)).status, 401)
        assert.equal((await profile(web.token)).status, 200)
      },
    )

    await t.test(
      'changing the password revokes mobile sessions on all devices',
      async () => {
        const first = await (await login(true)).json()
        const second = await (await login(true)).json()
        const result = await request('/users/me', {
          method: 'PATCH',
          token: first.token,
          body: { currentPassword: password, password: 'Updated3!' },
        })
        assert.equal(result.status, 200)
        assert.equal((await profile(first.token)).status, 401)
        assert.equal((await profile(second.token)).status, 401)
        assert.equal((await refresh(second.refreshToken)).status, 401)
      },
    )
  },
)
