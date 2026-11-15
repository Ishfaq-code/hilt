import type { SubmitEvent } from 'react'
import { useState } from 'react'
import { api } from '../../lib/api'
import type { Application } from '../../types'
import {
  buttonClass,
  inputClass,
  panelClass,
  secondaryClass,
} from '../ui/styles'

const steps = ['Club details', 'Contact and links', 'Review']

type Details = {
  organizationName: string
  organizationDescription: string
  category: string
  contactEmail: string
  link: string
}

const emptyDetails: Details = {
  organizationName: '',
  organizationDescription: '',
  category: '',
  contactEmail: '',
  link: '',
}

export function NewApplication({
  onSubmitted,
}: {
  onSubmitted: (application: Application) => void
}) {
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<Details>(emptyDetails)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function set<K extends keyof Details>(key: K, value: Details[K]) {
    setDetails((current) => ({ ...current, [key]: value }))
    setError('')
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < 2) {
      setStep((current) => current + 1)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await api<Application>('/api/applications', {
        method: 'POST',
        body: JSON.stringify(details),
      })
      onSubmitted(result)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to submit your application.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6">
      <ol
        aria-label="Application steps"
        className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-sm"
      >
        {steps.map((title, index) => (
          <li
            key={title}
            aria-current={index === step ? 'step' : undefined}
            className={
              index === step ? 'font-semibold text-accent' : 'text-muted'
            }
          >
            {index + 1}. {title}
          </li>
        ))}
      </ol>
      <h2 className="mb-3 text-xl font-semibold">
        {step === 2 ? 'Review your application' : steps[step]}
      </h2>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        {step === 0 && (
          <div className={`${panelClass} space-y-4 p-5`}>
            <label className="block text-sm font-medium">
              Club name
              <input
                className={`${inputClass} mt-2`}
                autoComplete="organization"
                maxLength={120}
                required
                value={details.organizationName}
                onChange={(event) =>
                  set('organizationName', event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-medium">
              Category
              <select
                className={`${inputClass} mt-2`}
                required
                value={details.category}
                onChange={(event) => set('category', event.target.value)}
              >
                <option value="">Choose a category</option>
                <option>Technology</option>
                <option>Outdoors</option>
                <option>Arts</option>
                <option>Culture</option>
                <option>Academic</option>
                <option>Other</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              About the club
              <textarea
                className={`${inputClass} mt-2`}
                rows={4}
                maxLength={3000}
                required
                value={details.organizationDescription}
                onChange={(event) =>
                  set('organizationDescription', event.target.value)
                }
              />
            </label>
          </div>
        )}
        {step === 1 && (
          <div className={`${panelClass} space-y-4 p-5`}>
            <p className="text-sm font-medium">
              Organization contact information
            </p>
            <label className="block text-sm font-medium">
              Contact email
              <input
                type="email"
                className={`${inputClass} mt-2`}
                autoComplete="email"
                required
                value={details.contactEmail}
                onChange={(event) => set('contactEmail', event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Supporting link{' '}
              <span className="font-normal text-muted">(optional)</span>
              <input
                type="url"
                className={`${inputClass} mt-2`}
                placeholder="https://"
                value={details.link}
                onChange={(event) => set('link', event.target.value)}
              />
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-lg font-semibold">{details.organizationName}</p>
            <div className={`${panelClass} space-y-3 p-5`}>
              <p className="text-xs font-semibold text-muted">
                {details.category}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {details.organizationDescription}
              </p>
              <div className="border-t border-line pt-3 text-sm">
                <p>
                  <strong>Contact:</strong> {details.contactEmail}
                </p>
                {details.link && (
                  <p className="mt-1">
                    <strong>Link:</strong> {details.link}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted">
              An administrator will review your application. You can follow its
              status from My applications.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {step > 0 && (
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                setError('')
                setStep((current) => current - 1)
              }}
            >
              Back
            </button>
          )}
          <button className={buttonClass} disabled={busy}>
            {busy
              ? 'Submitting…'
              : step === 2
                ? 'Submit application'
                : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
