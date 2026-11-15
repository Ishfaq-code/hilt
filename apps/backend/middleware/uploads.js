const multer = require('multer')

const png = Buffer.from('89504e470d0a1a0a', 'hex')
const jpeg = Buffer.from('ffd8ff', 'hex')
const megabyte = 1024 * 1024

function uploadError(message, status = 400) {
  return Object.assign(new Error(message), { name: 'UploadError', status })
}

function fileType(file) {
  const bytes = file.buffer
  if (file.fieldname === 'document') {
    if (bytes.subarray(0, 5).toString() === '%PDF-')
      return { contentType: 'application/pdf', extension: 'pdf' }
    throw uploadError('Upload a PDF document.')
  }

  if (file.size > 5 * megabyte)
    throw uploadError('Images must be 5 MB or smaller.', 413)
  if (bytes.subarray(0, 8).equals(png))
    return { contentType: 'image/png', extension: 'png' }
  if (bytes.subarray(0, 3).equals(jpeg))
    return { contentType: 'image/jpeg', extension: 'jpg' }
  if (
    bytes.subarray(0, 4).toString() === 'RIFF' &&
    bytes.subarray(8, 12).toString() === 'WEBP'
  )
    return { contentType: 'image/webp', extension: 'webp' }

  throw uploadError('Upload a JPEG, PNG, or WebP image.')
}

function uploads(...fields) {
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: (fields.includes('document') ? 10 : 5) * megabyte,
      files: fields.length,
      fields: 30,
    },
  }).fields(fields.map((name) => ({ name, maxCount: 1 })))

  return (req, res, next) => {
    req.uploads = {}
    if (!req.is('multipart/form-data')) return next()

    parse(req, res, (error) => {
      if (error) {
        return next(
          error.code === 'LIMIT_FILE_SIZE'
            ? uploadError('The uploaded file is too large.', 413)
            : uploadError('Provide valid upload fields.'),
        )
      }

      try {
        for (const [field, [file]] of Object.entries(req.files)) {
          req.uploads[field] = { ...file, ...fileType(file) }
        }
        if (Object.hasOwn(req.body, 'details')) {
          req.body = JSON.parse(req.body.details)
        }
      } catch (error) {
        return next(
          error instanceof SyntaxError
            ? uploadError('The request details must be valid JSON.')
            : error,
        )
      }

      next()
    })
  }
}

module.exports = { uploads, uploadError }
