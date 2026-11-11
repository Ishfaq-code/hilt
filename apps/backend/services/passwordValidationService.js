function isValid(password) {
  return typeof password === 'string' && password.length >= 8 && /\d/.test(password) && /[^\w\s]/.test(password)
}

module.exports = { isValid }
