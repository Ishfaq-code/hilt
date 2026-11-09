import type { FormEvent } from 'react'

import PageFrame from '../components/PageFrame'
import { useClubWorkspace } from '../hooks/useClubWorkspace'
import { signInUrl } from '../navigation'
import type { PageProps } from '../types'

export default function Apply(props: PageProps) {
  const workspace = useClubWorkspace('apply', props)
  const { data, editing, editingId, pending, mutate } = workspace
  const user = props.session?.user

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const links = String(form.get('links') || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const body = {
      name: form.get('name'),
      description: form.get('description'),
      universityId: form.get('universityId'),
      contactEmail: form.get('contactEmail'),
      links,
      ...(editing ? { revision: editing.revision } : {}),
    }

    const saved = await mutate(
      editing ? `/club-applications/${editing.id}` : '/club-applications',
      editing ? 'PATCH' : 'POST',
      body,
    )

    if (saved) {
      location.assign('/home')
    }
  }

  return (
    <PageFrame
      title={editing ? 'Update your application' : 'Start something on campus.'}
      back={user
        ? { href: '/home', label: 'My clubs' }
        : { href: '/discover', label: 'Discover' }}
      workspace={workspace}
      hideRefresh
    >
      {data && (
        !user ? (
          <div className="empty-state">
            <h2>Apply for your club.</h2>
            <p>Sign in with your university email to submit a club for review.</p>
            <a className="button-link" href={signInUrl()}>Sign in to apply</a>
          </div>
        ) : editingId && !editing ? (
          <p>
            This application is unavailable for editing.{' '}
            <a href="/home">Your applications</a>
          </p>
        ) : (
          <form
            className="application-form"
            key={editing?.id || 'new'}
            onSubmit={submitApplication}
          >
            <p>
              Tell us about your club. A site administrator will review it before it appears in discovery.
            </p>

            <fieldset disabled={pending} className="fields">
              <label>
                University
                <select
                  name="universityId"
                  defaultValue={editing?.university.id || data.universities[0]?.id}
                  required
                >
                  {data.universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Club name
                <input name="name" defaultValue={editing?.name} maxLength={100} required />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={editing?.description}
                  maxLength={4000}
                  rows={5}
                  required
                />
              </label>

              <label>
                Contact email
                <input
                  type="email"
                  name="contactEmail"
                  defaultValue={editing?.contactEmail || user.emailAddress}
                  maxLength={254}
                  required
                />
              </label>

              <label>
                Links
                <textarea
                  name="links"
                  defaultValue={editing?.links.join('\n')}
                  rows={3}
                  placeholder="https://your-club.example"
                  aria-describedby="club-links-hint"
                />
              </label>

              <p className="hint" id="club-links-hint">
                Optional. Up to five website or social links, one per line.
              </p>

              <div className="club-actions">
                <button>
                  {pending
                    ? 'Submitting…'
                    : editing ? 'Resubmit application' : 'Submit application'}
                </button>
                <a href="/home">Cancel</a>
              </div>
            </fieldset>
          </form>
        )
      )}
    </PageFrame>
  )
}
