import type { SubmitEvent } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { saveAuthSession } from '../lib/auth'
import { joinClub, myClubPath } from '../lib/clubs'
import type { ApiResponse } from '../types'

type AuthPageProps = { initialMode: 'login' | 'signup' }

type AuthLocationState = {
  from?: string
  joinOrganizationId?: string
  afterJoin?: string
}

export default function AuthPage({ initialMode }: AuthPageProps) {
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

  async function finish(defaultPath: string) {
    const state = location.state as AuthLocationState | null
    const destination = state?.from || defaultPath
    const clubId = state?.joinOrganizationId
    if (!clubId) {
      navigate(destination, { replace: true })
      return
    }

    try {
      await joinClub(clubId)
      navigate(state?.afterJoin || myClubPath(clubId), { replace: true })
    } catch (cause) {
      navigate(destination, {
        replace: true,
        state: {
          joinError:
            cause instanceof Error ? cause.message : 'Couldn’t join the club.',
        },
      })
    }
  }

  async function request(endpoint: string, body: Record<string, string>) {
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = (await response.json()) as ApiResponse
    if (!response.ok)
      throw new Error(result.error || 'Something went wrong. Please try again.')
    return result
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (initialMode === 'login') {
        const result = await request('login', { email, password })
        saveAuthSession(result)
        await finish('/my-organizations')
      } else {
        const result = await request('register', {
          firstName,
          lastName,
          email,
          password,
        })
        setMessage(
          result.message || 'Check your email for a verification code.',
        )
        setStage('verify')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to continue.')
    } finally {
      setBusy(false)
    }
  }

  async function verify(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await request('verify-email', { email, code })
      saveAuthSession(result)
      setMessage(
        `Welcome${result.firstName ? `, ${result.firstName}` : ''}! Your email is verified.`,
      )
      setStage('complete')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to verify the code.',
      )
    } finally {
      setBusy(false)
    }
  }
  const title =
    stage === 'verify'
      ? 'Verify your email'
      : stage === 'complete'
        ? 'Account created'
        : initialMode === 'login'
          ? 'Log in'
          : 'Create account'
  const textAction = 'text-sm font-medium text-accent hover:underline'

  return (
    <section className="mx-auto max-w-md px-4 pt-10">
      <div className="rounded-xl border border-line bg-white p-6">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 mb-5 text-sm leading-relaxed text-muted">
          {stage === 'verify' ? (
            <>
              We sent a verification code to <strong>{email}</strong>.
            </>
          ) : stage === 'complete' ? (
            'Your account is ready to use.'
          ) : initialMode === 'login' ? (
            'Log in to connect with your campus community.'
          ) : (
            'Create an account to explore and join organizations.'
          )}
        </p>
        {message && (
          <p role="status" className="mb-4 text-sm text-active">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {stage === 'form' && (
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            {initialMode === 'signup' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  First name
                  <input
                    className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium">
                  Last name
                  <input
                    className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                </label>
              </div>
            )}
            <label className="block text-sm font-medium">
              Email address
              <input
                type="email"
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                autoComplete={
                  initialMode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={initialMode === 'signup' ? 8 : undefined}
                required
              />
              {initialMode === 'signup' && (
                <span className="mt-1 block text-xs text-muted">
                  At least 8 characters, including a number and a symbol.
                </span>
              )}
            </label>
            <button
              className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-active disabled:opacity-50"
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Please wait…'
                : initialMode === 'login'
                  ? 'Log in'
                  : 'Continue'}
            </button>
          </form>
        )}
        {stage === 'verify' && (
          <form className="space-y-4" onSubmit={(event) => void verify(event)}>
            <label className="block text-sm font-medium">
              Verification code
              <input
                className="mt-2 min-h-12 w-full rounded-lg border border-line bg-white px-3 py-2 text-center text-xl font-semibold tracking-[.32em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                required
              />
            </label>
            <button
              className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-active disabled:opacity-50"
              disabled={busy || code.length !== 6}
            >
              {busy ? 'Verifying…' : 'Verify email'}
            </button>
          </form>
        )}
        {stage === 'complete' && (
          <>
            <p className="mb-5 text-sm text-muted">
              Your email has been verified and your account is ready.
            </p>
            <button
              className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-active"
              onClick={() => void finish('/')}
            >
              {location.state ? 'Continue' : 'Explore organizations'}
            </button>
          </>
        )}
        {stage === 'form' && (
          <p className="mt-5 text-center text-sm text-muted">
            {initialMode === 'login'
              ? 'New to Hilt?'
              : 'Already have an account?'}{' '}
            <button
              className={textAction}
              onClick={() =>
                navigate(initialMode === 'login' ? '/register' : '/login', {
                  state: location.state,
                })
              }
            >
              {initialMode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
        )}
      </div>
    </section>
  )
}
