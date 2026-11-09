import { useState } from 'react'
import type { FormEvent } from 'react'

import Dialog from '../Dialog'
import { ApiError, request } from '../api'
import { returnPath, signInUrl } from '../navigation'
import type { PageProps, User } from '../types'

export default function Account({ session, expireSession }: PageProps) {
  const params = new URLSearchParams(location.search)
  const registering = params.get('mode') === 'register'
  const next = returnPath(params.get('next'))

  let initialNotice = ''

  if (params.has('expired')) {
    initialNotice = 'Your session expired. Sign in again.'
  } else if (params.has('signedOut')) {
    initialNotice = 'Signed out.'
  }

  const [profile, setProfile] = useState(session?.user)
  const [editing, setEditing] = useState(false)
  const [created, setCreated] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(initialNotice)

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pending) {
      return
    }

    const form = new FormData(event.currentTarget)
    const credentials = {
      emailAddress: String(form.get('emailAddress')).trim(),
      password: String(form.get('password')),
    }

    if (registering && Array.from(credentials.password).length < 15) {
      setError('Use at least 15 characters for your password.')
      return
    }

    setPending(true)
    setError('')

    let accountCreated = false

    try {
      if (registering) {
        await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            ...credentials,
            firstName: String(form.get('firstName')).trim(),
            lastName: String(form.get('lastName')).trim(),
          }),
        })

        accountCreated = true
      }

      await request('/auth/login', {
        method: 'POST',
        headers: { 'X-Session-Mode': 'cookie' },
        body: JSON.stringify(credentials),
      })

      location.replace(next)
    } catch (cause) {
      if (accountCreated) {
        setCreated(true)
      }

      setError(cause instanceof Error ? cause.message : 'Couldn’t sign in. Try again.')
    } finally {
      setPending(false)
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pending) {
      return
    }

    const form = new FormData(event.currentTarget)

    setPending(true)
    setError('')

    try {
      const result = await request<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: String(form.get('firstName')).trim(),
          lastName: String(form.get('lastName')).trim(),
        }),
      })

      setProfile(result.user)
      setEditing(false)
      setNotice('Profile saved.')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        expireSession()
      }

      setError(cause instanceof Error ? cause.message : 'Couldn’t save your profile. Try again.')
    } finally {
      setPending(false)
    }
  }

  async function signOut() {
    if (pending) {
      return
    }

    setPending(true)
    setError('')

    try {
      await request('/auth/logout', { method: 'POST' })
      location.replace('/account?signedOut=1')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        location.replace('/account?signedOut=1')
      } else {
        setError('Couldn’t sign out. Try again.')
      }
    } finally {
      setPending(false)
    }
  }

  function openEditor() {
    setEditing(true)
    setError('')
    setNotice('')
  }

  function closeEditor() {
    setEditing(false)
    setError('')
  }

  let title = 'Sign in'

  if (profile) {
    title = 'Account'
  } else if (created) {
    title = 'Account created'
  } else if (registering) {
    title = 'Create account'
  }

  const registerUrl = `/account?${new URLSearchParams({ mode: 'register', next })}`

  return (
    <>
      <div className="page-heading">
        <h1>{title}</h1>
      </div>

      {notice && <p className="notice" role="status">{notice}</p>}
      {error && !editing && <p className="error" role="alert">{error}</p>}

      {profile ? (
        <div className="account-content">
          <section className="club-card">
            <div className="row-heading">
              <h2>Profile</h2>
              <button className="secondary-button" disabled={pending} onClick={openEditor}>
                Edit profile
              </button>
            </div>

            <dl className="profile-details">
              <div>
                <dt>First name</dt>
                <dd>{profile.firstName}</dd>
              </div>
              <div>
                <dt>Last name</dt>
                <dd>{profile.lastName}</dd>
              </div>
              <div>
                <dt>Email address</dt>
                <dd>{profile.emailAddress}</dd>
              </div>
            </dl>
          </section>

          <div className="account-actions">
            <button className="secondary-button" disabled={pending} onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      ) : created ? (
        <p>
          Your account was created. <a href={signInUrl(next)}>Sign in to continue</a>.
        </p>
      ) : (
        <div className="auth-form">
          <form onSubmit={submitCredentials}>
            <fieldset className="fields" disabled={pending}>
              {registering && (
                <div className="names">
                  <label>
                    First name
                    <input
                      name="firstName"
                      autoComplete="given-name"
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="lastName"
                      autoComplete="family-name"
                      maxLength={100}
                      required
                    />
                  </label>
                </div>
              )}

              <label>
                Email address
                <input type="email" name="emailAddress" autoComplete="username" required />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  aria-describedby={registering ? 'password-hint' : undefined}
                />
              </label>

              {registering && (
                <p className="hint" id="password-hint">Use 15–128 characters.</p>
              )}

              <button aria-busy={pending}>
                {pending ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
              </button>
            </fieldset>
          </form>

          <p className="switch">
            {registering ? 'Already have an account? ' : 'Need an account? '}
            <a href={registering ? signInUrl(next) : registerUrl}>
              {registering ? 'Sign in' : 'Create account'}
            </a>
          </p>
        </div>
      )}

      {editing && profile && (
        <Dialog title="Edit profile" pending={pending} close={closeEditor}>
          {error && <p className="error" role="alert">{error}</p>}

          <form onSubmit={saveProfile}>
            <fieldset className="fields" disabled={pending}>
              <div className="names">
                <label>
                  First name
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    defaultValue={profile.firstName}
                    maxLength={100}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    defaultValue={profile.lastName}
                    maxLength={100}
                    required
                  />
                </label>
              </div>

              <div className="dialog-actions">
                <button type="button" className="secondary-button" onClick={closeEditor}>
                  Cancel
                </button>
                <button>{pending ? 'Saving…' : 'Save profile'}</button>
              </div>
            </fieldset>
          </form>
        </Dialog>
      )}
    </>
  )
}
