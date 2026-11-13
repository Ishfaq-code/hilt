import { useState } from 'react'
import type { FormEvent } from 'react'

type AuthResponse = {
  error?: string
  message?: string
  token?: string
  firstName?: string
  lastName?: string
  role?: string
}

function App() {
  const [stage, setStage] = useState<'signup' | 'verify' | 'complete'>('signup')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function request(endpoint: string, body: Record<string, string>) {
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await response.json()) as AuthResponse
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
    return data
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await request('register', { firstName, lastName, email, password })
      setMessage(result.message || 'Check your email for a verification code.')
      setStage('verify')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start signup.')
    } finally {
      setBusy(false)
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await request('verify-email', { email, code })
      if (result.token) sessionStorage.setItem('authToken', result.token)
      setMessage(`Welcome${result.firstName ? `, ${result.firstName}` : ''}! Your email is verified.`)
      setStage('complete')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify the code.')
    } finally {
      setBusy(false)
    }
  }

  async function resendCode() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await request('resend-verification', { email })
      setMessage(result.message || 'A new code has been sent.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to resend the code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">H</div>
        <p className="eyebrow">HILT ACCOUNT</p>
        <h1 id="page-title">
          {stage === 'signup' && 'Create your account'}
          {stage === 'verify' && 'Check your inbox'}
          {stage === 'complete' && 'You’re all set'}
        </h1>
        <p className="intro">
          {stage === 'signup' && 'Sign up to get started with Hilt.'}
          {stage === 'verify' && <>We sent a 6-digit verification code to <strong>{email}</strong>.</>}
          {stage === 'complete' && 'Your email has been verified and your account is ready.'}
        </p>

        {message && <p className="notice" role="status">{message}</p>}
        {error && <p className="error" role="alert">{error}</p>}

        {stage === 'signup' && (
          <form onSubmit={submitSignup}>
            <div className="name-fields">
              <label>First name<input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
              <label>Last name<input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
            </div>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><span className="hint">At least 8 characters, including a number and a symbol.</span></label>
            <button type="submit" disabled={busy}>{busy ? 'Sending code…' : 'Continue'}</button>
          </form>
        )}

        {stage === 'verify' && (
          <form onSubmit={submitVerification}>
            <label>Verification code<input className="code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required /></label>
            <button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify email'}</button>
            <div className="form-links">
              <button className="text-button" type="button" onClick={resendCode} disabled={busy}>Resend code</button>
              <button className="text-button" type="button" onClick={() => { setStage('signup'); setError(''); setMessage('') }}>Change email</button>
            </div>
          </form>
        )}

        {stage === 'complete' && <p className="success-mark" aria-label="Verified">✓</p>}
        <p className="footnote">A verification code is valid for 10 minutes.</p>
      </section>
    </main>
  )
}

export default App
