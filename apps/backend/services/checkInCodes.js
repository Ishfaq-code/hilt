const {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} = require('node:crypto')

const lifetime = 10 * 60 * 1000

function key() {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update('hilt-check-in')
    .digest()
}

function issueCode(details) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const expiresAt = Date.now() + lifetime
  const payload = JSON.stringify({ ...details, expiresAt })
  const encrypted = Buffer.concat([
    cipher.update(payload, 'utf8'),
    cipher.final(),
  ])

  return {
    code: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64url',
    ),
    expiresAt,
  }
}

function readCode(code, kind) {
  if (typeof code !== 'string' || code.length > 512 || !/^[\w-]+$/.test(code))
    return null

  try {
    const bytes = Buffer.from(code, 'base64url')
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key(),
      bytes.subarray(0, 12),
    )
    decipher.setAuthTag(bytes.subarray(12, 28))
    const payload = Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ])
    const details = JSON.parse(payload.toString('utf8'))

    return details.kind === kind && details.expiresAt > Date.now()
      ? details
      : null
  } catch {
    return null
  }
}

module.exports = { issueCode, readCode }
