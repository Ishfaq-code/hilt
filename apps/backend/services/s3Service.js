const crypto = require('node:crypto')
const path = require('node:path')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')

let client

function getConfiguration() {
  const bucket = process.env.S3_BUCKET
  const region = process.env.AWS_REGION || process.env.S3_REGION

  if (!bucket || !region) {
    throw new Error('S3 is not configured. Set S3_BUCKET and AWS_REGION.')
  }

  return { bucket, region }
}

function getClient(region) {
  if (!client) {
    client = new S3Client({ region })
  }
  return client
}

function sanitizeFilename(filename) {
  const basename = path.basename(filename || 'asset')
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset'
}

function createObjectKey(originalName, prefix = 'assets') {
  const safePrefix = String(prefix).split('/').filter(Boolean).join('/')
  const filename = sanitizeFilename(originalName)
  const id = crypto.randomUUID()
  return [safePrefix, `${id}-${filename}`].filter(Boolean).join('/')
}

async function uploadFile({ buffer, originalName, contentType, prefix } = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('buffer must be a Buffer.')
  }
  if (buffer.length === 0) {
    throw new TypeError('buffer must not be empty.')
  }
  if (typeof originalName !== 'string' || !originalName.trim()) {
    throw new TypeError('originalName is required.')
  }
  if (typeof contentType !== 'string' || !contentType.trim()) {
    throw new TypeError('contentType is required.')
  }

  const { bucket, region } = getConfiguration()
  const key = createObjectKey(originalName, prefix)

  await getClient(region).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  return {
    key,
    url: `https://${bucket}.s3.${region}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`,
  }
}

async function deleteFile(key) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new TypeError('key is required.')
  }

  const { bucket, region } = getConfiguration()
  await getClient(region).send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

module.exports = { uploadFile, deleteFile }
