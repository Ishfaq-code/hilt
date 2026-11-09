function expectJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({
      error: 'Send the request as application/json.',
    })
  }

  next()
}

function validateClubId(req, res, next, id) {
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid club ID.' })
  }

  next()
}

function allowedFields(body, fields) {
  return body
    && !Array.isArray(body)
    && typeof body === 'object'
    && Object.keys(body).every((key) => fields.includes(key))
}

function validRevision(value) {
  return Number.isSafeInteger(value) && value >= 0
}

module.exports = {
  expectJson,
  validateClubId,
  allowedFields,
  validRevision,
}
