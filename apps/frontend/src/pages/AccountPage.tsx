import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buttonClass,
  inputClass,
  panelClass,
  secondaryClass,
} from '../components/ui/styles'
import { useAuthDialog } from '../hooks/useAuthDialog'
import { useSiteSession } from '../hooks/useCurrentUser'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { signOut } from '../lib/auth'
import { isNativeApp } from '../lib/platform'
import type { AuthUser } from '../types'

export default function AccountPage() {
  const { user, token, updateUser } = useSiteSession()
  const openLogin = useAuthDialog()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState<'profile' | 'password' | null>(null)

  async function save(
    section: NonNullable<typeof saving>,
    values: Record<string, FormDataEntryValue | null>,
  ) {
    setSaving(section)
    try {
      const profile = await api<AuthUser>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(values),
      })
      updateUser(profile)
      toast({
        title: section === 'profile' ? 'Profile saved' : 'Password changed',
      })
      return true
    } catch (cause) {
      toast({
        title:
          cause instanceof Error ? cause.message : 'Couldn’t save changes.',
        variant: 'destructive',
      })
      return false
    } finally {
      setSaving(null)
    }
  }

  function saveProfile(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void save('profile', {
      firstName: data.get('firstName'),
      lastName: data.get('lastName'),
      phoneNumber: data.get('phoneNumber'),
    })
  }

  async function changePassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (
      await save('password', {
        currentPassword: data.get('currentPassword'),
        password: data.get('password'),
      })
    )
      form.reset()
  }

  async function logOut() {
    try {
      await signOut()
      navigate(isNativeApp ? '/my-organizations' : '/', { replace: true })
    } catch {
      toast({
        title: 'Couldn’t sign out. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 pt-9 sm:px-8 sm:pt-13">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      {!token ? (
        <button
          type="button"
          className={buttonClass}
          aria-haspopup="dialog"
          onClick={() => openLogin()}
        >
          Log in
        </button>
      ) : !user?.id ? (
        <p role="status" className="text-sm text-muted">
          Loading account…
        </p>
      ) : (
        <>
          <form
            className={panelClass + ' space-y-4 p-5'}
            onSubmit={saveProfile}
          >
            <h2 className="text-xl font-semibold">Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                First name
                <input
                  name="firstName"
                  className={inputClass + ' mt-2'}
                  autoComplete="given-name"
                  defaultValue={user.firstName}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Last name
                <input
                  name="lastName"
                  className={inputClass + ' mt-2'}
                  autoComplete="family-name"
                  defaultValue={user.lastName}
                  required
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Email address
              <input
                className={inputClass + ' mt-2 bg-paper'}
                value={user.email ?? ''}
                readOnly
              />
            </label>
            <label className="block text-sm font-medium">
              Phone number{' '}
              <span className="font-normal text-muted">(optional)</span>
              <input
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                className={inputClass + ' mt-2'}
                defaultValue={user.phoneNumber ?? ''}
              />
            </label>
            <div className="flex justify-end">
              <button className={buttonClass} disabled={saving !== null}>
                {saving === 'profile' ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
          <form
            className={panelClass + ' space-y-4 p-5'}
            onSubmit={(event) => void changePassword(event)}
          >
            <h2 className="text-xl font-semibold">Password</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className={inputClass + ' mt-2'}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                New password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className={inputClass + ' mt-2'}
                  minLength={8}
                  aria-describedby="password-requirements"
                  required
                />
              </label>
            </div>
            <p id="password-requirements" className="text-xs text-muted">
              At least 8 characters, including a number and a symbol.
            </p>
            <div className="flex justify-end">
              <button className={buttonClass} disabled={saving !== null}>
                {saving === 'password' ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </form>
        </>
      )}
      {token && (
        <div className="flex justify-end">
          <button
            type="button"
            className={secondaryClass}
            onClick={() => void logOut()}
          >
            Sign out
          </button>
        </div>
      )}
    </section>
  )
}
