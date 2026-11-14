import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { saveAuthSession } from '../auth'
import type { ApiResponse } from '../types'

type AuthPageProps = { initialMode: 'login' | 'signup' }
type AuthLocationState = { from?: string; joinOrganizationId?: string }

function AuthPage({ initialMode }: AuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [stage, setStage] = useState<'form' | 'verify' | 'complete'>('form')
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
    const data = (await response.json()) as ApiResponse
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
    return data
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (initialMode === 'login') {
        const result = await request('login', { email, password })
        saveAuthSession(result)
        const state = location.state as AuthLocationState | null
        navigate(state?.from || '/application', { replace: true, state: state?.joinOrganizationId ? { joinOrganizationId: state.joinOrganizationId } : null })
      } else {
        const result = await request('register', { firstName, lastName, email, password })
        setMessage(result.message || 'Check your email for a verification code.')
        setStage('verify')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to continue.')
    } finally {
      setBusy(false)
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await request('verify-email', { email, code })
      saveAuthSession(result)
      setMessage(`Welcome${result.firstName ? `, ${result.firstName}` : ''}! Your email is verified.`)
      setStage('complete')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify the code.')
    } finally {
      setBusy(false)
    }
  }

  const toggleMode = () => navigate(initialMode === 'login' ? '/register' : '/login', { state: location.state })

  return (
    <main className="auth-page">
      <button className="back-link auth-back" onClick={() => navigate('/')}>← Back to organizations</button>
      <section className="auth-card" aria-labelledby="page-title">
        <div className="brand-mark">H</div>
        <p className="eyebrow">HILT ACCOUNT</p>
        <h1 id="page-title">{stage === 'verify' ? 'Check your inbox' : stage === 'complete' ? 'You’re all set' : initialMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="intro">
          {stage === 'verify' ? <>We sent a 6-digit verification code to <strong>{email}</strong>.</> : stage === 'complete' ? 'Your email has been verified and your account is ready.' : initialMode === 'login' ? 'Log in to connect with your community.' : 'Sign up to get started with Hilt.'}
        </p>
        {message && <p className="notice" role="status">{message}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {stage === 'form' && (
          <form onSubmit={(event) => void submit(event)}>
            {initialMode === 'signup' && <div className="name-fields"><label>First name<input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label>Last name<input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label></div>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete={initialMode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={initialMode === 'signup' ? 8 : undefined} required />{initialMode === 'signup' && <span className="hint">At least 8 characters, including a number and a symbol.</span>}</label>
            <button type="submit" disabled={busy}>{busy ? 'Please wait…' : initialMode === 'login' ? 'Log in' : 'Continue'}</button>
          </form>
        )}
        {stage === 'verify' && <form onSubmit={(event) => void verify(event)}><label>Verification code<input className="code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required /></label><button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify email'}</button></form>}
        {stage === 'complete' && <><p className="success-mark" aria-label="Verified">✓</p><button className="auth-main-button" onClick={() => navigate('/')}>Explore organizations</button></>}
        {stage === 'form' && <p className="auth-switch">{initialMode === 'login' ? 'New to Hilt?' : 'Already have an account?'} <button className="text-button" onClick={toggleMode}>{initialMode === 'login' ? 'Create an account' : 'Log in'}</button></p>}
        {stage !== 'complete' && <p className="footnote">A verification code is valid for 10 minutes.</p>}
      </section>
    </main>
  )
}

export default AuthPage
