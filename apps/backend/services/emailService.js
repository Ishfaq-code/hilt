const { Resend } = require('resend')

async function sendVerificationCode(email, code) {
  const { RESEND_API_KEY, EMAIL_FROM } = process.env
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new Error('Email delivery is not configured.')
  }

  const resend = new Resend(RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: 'Your Hilt verification code',
    text: `Your Hilt verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
  })
  if (error) throw new Error(`Resend delivery failed: ${error.message}`)
}

module.exports = { sendVerificationCode }
