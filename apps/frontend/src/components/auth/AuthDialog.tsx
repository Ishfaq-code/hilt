import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { isNativeApp } from '../../lib/platform'
import { saveAuthSession } from '../../lib/auth'
import type { AuthIntent, AuthMode } from '../../lib/authDialog'
import { joinClub, myClubPath } from '../../lib/clubs'
import type { ApiResponse } from '../../types'
import { Dialog } from '../ui/Dialog'
import { buttonClass, inputClass, panelClass } from '../ui/styles'

async function request(
  endpoint: string,
  body: Record<string, string>,
  signal: AbortSignal,
) {
  return api<ApiResponse>(`/api/auth/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify({ ...body, ...(isNativeApp && { mobile: true }) }),
    signal,
  })
}

export function AuthDialog({
  mode,
  intent,
  onClose,
  onModeChange,
  onFinish,
}: {
  mode: AuthMode
  intent?: AuthIntent
  onClose?: () => void
  onModeChange: (mode: AuthMode) => void
  onFinish: (destination?: string, joinError?: string) => void
}) {
  const { toast } = useToast()
  const pending = useRef<AbortController>(null)
  const [stage, setStage] = useState<'form' | 'verify' | 'complete'>('form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => () => pending.current?.abort(), [])

  function startRequest() {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    return controller.signal
  }

  async function finish(signal: AbortSignal) {
    const clubId = intent?.joinOrganizationId
    if (!clubId) {
      onFinish(intent?.from)
      return
    }

    try {
      const added = await joinClub(clubId)
      if (!signal.aborted) {
        if (added)
          toast({
            title: 'Club joined',
            description: intent?.joinOrganizationName,
          })
        onFinish(intent?.afterJoin || myClubPath(clubId))
      }
    } catch (cause) {
      if (!signal.aborted) {
        onFinish(
          intent?.from,
          cause instanceof Error ? cause.message : 'Couldn’t join the club.',
        )
      }
    }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const signal = startRequest()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'login') {
        const result = await request('login', { email, password }, signal)
        if (signal.aborted) return
        await saveAuthSession(result)
        await finish(signal)
      } else {
        const result = await request(
          'register',
          {
            firstName,
            lastName,
            email,
            password,
          },
          signal,
        )
        if (signal.aborted) return
        setMessage(
          result.message || 'Check your email for a verification code.',
        )
        setStage('verify')
      }
    } catch (cause) {
      if (!signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Unable to continue.')
    } finally {
      if (!signal.aborted) setBusy(false)
    }
  }

  async function verify(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const signal = startRequest()
    setBusy(true)
    setError('')
    try {
      const result = await request('verify-email', { email, code }, signal)
      if (signal.aborted) return
      await saveAuthSession(result)
      setMessage(
        `Welcome${result.firstName ? `, ${result.firstName}` : ''}! Your email is verified.`,
      )
      setStage('complete')
    } catch (cause) {
      if (!signal.aborted)
        setError(
          cause instanceof Error ? cause.message : 'Unable to verify the code.',
        )
    } finally {
      if (!signal.aborted) setBusy(false)
    }
  }
  const title =
    stage === 'verify'
      ? 'Verify your email'
      : stage === 'complete'
        ? 'Account created'
        : mode === 'login'
          ? 'Log in'
          : 'Create account'
  const textAction = 'text-sm font-medium text-accent hover:underline'

  const content = (
    <>
      {stage === 'verify' && (
        <p className="mb-4 text-sm text-muted">
          Enter the verification code sent to <strong>{email}</strong>.
        </p>
      )}
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
          {mode === 'register' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                First name
                <input
                  className={inputClass + ' mt-2'}
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Last name
                <input
                  className={inputClass + ' mt-2'}
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
              className={inputClass + ' mt-2'}
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
              className={inputClass + ' mt-2'}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
            {mode === 'register' && (
              <span className="mt-1 block text-xs text-muted">
                At least 8 characters, including a number and a symbol.
              </span>
            )}
          </label>
          <button
            className={buttonClass + ' w-full'}
            type="submit"
            disabled={busy}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Continue'}
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
            className={buttonClass + ' w-full'}
            disabled={busy || code.length !== 6}
          >
            {busy ? 'Verifying…' : 'Verify email'}
          </button>
        </form>
      )}
      {stage === 'complete' && (
        <>
          <button
            className={buttonClass + ' w-full'}
            disabled={busy}
            onClick={() => {
              setBusy(true)
              const signal = startRequest()
              void finish(signal).finally(() => {
                if (!signal.aborted) setBusy(false)
              })
            }}
          >
            Continue
          </button>
        </>
      )}
      {stage === 'form' && (
        <p className="mt-5 text-center text-sm text-muted">
          {mode === 'login' ? 'New to Hilt?' : 'Already have an account?'}{' '}
          <button
            className={textAction}
            disabled={busy}
            onClick={() => {
              setError('')
              setPassword('')
              onModeChange(mode === 'login' ? 'register' : 'login')
            }}
          >
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </p>
      )}
    </>
  )

  if (onClose) {
    return (
      <Dialog title={title} onClose={onClose} compact>
        {content}
      </Dialog>
    )
  }

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <p className="mb-6 text-3xl font-bold tracking-tight">
        Hilt<span className="text-accent">.</span>
      </p>
      <section className={panelClass + ' p-5'}>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h1>
        {content}
      </section>
    </main>
  )
}
