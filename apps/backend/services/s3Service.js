const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3')

let client

async function send(Command, input) {
  const bucket = process.env.S3_BUCKET
  const region = process.env.AWS_REGION || process.env.S3_REGION
  const endpoint = process.env.S3_ENDPOINT || undefined
  if (!bucket || !region) throw new StorageError()

  client ??= new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
  })
  try {
    return await client.send(new Command({ Bucket: bucket, ...input }))
  } catch (error) {
    if (error.name === 'NoSuchKey') return null
    console.error('Object storage request failed:', error.name)
    throw new StorageError()
  }
}

class StorageError extends Error {
  constructor() {
    super('File storage is unavailable. Try again in a moment.')
    this.name = 'StorageError'
    this.status = 503
  }
}

function putFile(key, file) {
  return send(PutObjectCommand, {
    Key: key,
    Body: file.buffer,
    ContentType: file.contentType,
  })
}

function getFile(key) {
  return send(GetObjectCommand, { Key: key })
}

function deleteFile(key) {
  return send(DeleteObjectCommand, { Key: key })
}

module.exports = { putFile, getFile, deleteFile }
