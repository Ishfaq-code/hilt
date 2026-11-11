const assert = require('node:assert/strict')
const { once } = require('node:events')
const { test } = require('node:test')
const app = require('../server')

test('server exposes health and no longer exposes authentication endpoints', async (t) => {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => server.close(resolve)))

  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const health = await fetch(`${baseUrl}/api/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok', mongodb: 'disconnected' })

  for (const [path, method] of [
    ['/api/auth/register', 'POST'],
    ['/api/auth/login', 'POST'],
    ['/api/auth/me', 'GET'],
    ['/api/auth/logout', 'POST'],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method })
    assert.equal(response.status, 404, `${method} ${path} should not exist`)
  }
})
