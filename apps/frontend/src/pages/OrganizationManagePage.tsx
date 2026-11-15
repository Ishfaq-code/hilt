import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  buttonClass,
  inputClass,
  panelClass,
  secondaryClass,
  Workspace,
} from '../components/wireframe/Design'
import { api } from '../lib/api'
import type { Organization } from '../types'

type Member = {
  _id: string
  organizationRole: 'student' | 'officer' | 'owner'
  isPaid: boolean
  userId: { _id?: string; firstName: string; lastName: string; email: string }
}
type Stats = {
  totalMembers: number
  paidMembers: number
  events: number
  roles: Record<string, number>
}
type Membership = {
  organizationRole: 'student' | 'officer' | 'owner'
  organizationId: { _id: string }
}
type ManagedEvent = NonNullable<Organization['events']>[number]
const tabs = [
  { key: 'info', label: 'Info' },
  { key: 'events', label: 'Events' },
  { key: 'members', label: 'Members' },
  { key: 'statistics', label: 'Statistics' },
] as const
type TabKey = (typeof tabs)[number]['key']

function EventEditor({
  organizationId,
  event,
  onSaved,
  onCancel,
}: {
  organizationId: string
  event?: ManagedEvent
  onSaved: () => void
  onCancel?: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError('')
    setBusy(true)
    const data = new FormData(formEvent.currentTarget)
    const start = new Date(`${data.get('date')}T${data.get('startTime')}`)
    const end = new Date(`${data.get('date')}T${data.get('endTime')}`)
    if (end <= start) {
      setError('The end time must be after the start time.')
      setBusy(false)
      return
    }
    const payload = {
      name: String(data.get('name')).trim(),
      description: data.get('description'),
      startDatetime: start.toISOString(),
      endDatetime: end.toISOString(),
      place: data.get('place'),
      type: data.get('type'),
      private: data.get('visibility') === 'members',
      banner: data.get('banner') || null,
    }
    try {
      await api(
        `/api/organizations/${organizationId}/events${event ? `/${event._id}` : ''}`,
        { method: event ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      )
      onSaved()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save the event.',
      )
    } finally {
      setBusy(false)
    }
  }
  const localStart = event ? new Date(event.startDatetime) : undefined
  const localEnd = event ? new Date(event.endDatetime) : undefined
  const date = localStart
    ? `${localStart.getFullYear()}-${String(localStart.getMonth() + 1).padStart(2, '0')}-${String(localStart.getDate()).padStart(2, '0')}`
    : ''
  const timeValue = (value?: Date) =>
    value
      ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
      : ''
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={`${panelClass} mt-4 space-y-4 p-5`}
    >
      <h2 className="text-xl font-semibold">
        {event ? 'Edit event' : 'New event'}
      </h2>
      <label className="block text-sm font-medium">
        Title
        <input
          name="name"
          className={`${inputClass} mt-2`}
          defaultValue={event?.name}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Banner image URL{' '}
        <span className="font-normal text-muted">(optional)</span>
        <input
          name="banner"
          type="url"
          className={`${inputClass} mt-2`}
          defaultValue={event?.banner || ''}
          placeholder="https://"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Date
          <input
            name="date"
            type="date"
            className={`${inputClass} mt-2`}
            defaultValue={date}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Start time
          <input
            name="startTime"
            type="time"
            className={`${inputClass} mt-2`}
            defaultValue={timeValue(localStart) || '18:00'}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          End time
          <input
            name="endTime"
            type="time"
            className={`${inputClass} mt-2`}
            defaultValue={timeValue(localEnd) || '19:00'}
            required
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Location
        <input
          name="place"
          className={`${inputClass} mt-2`}
          defaultValue={event?.place || ''}
          placeholder="Building and room"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Event type
          <select
            name="type"
            className={`${inputClass} mt-2`}
            defaultValue={event?.type || 'Workshop'}
          >
            <option>Workshop</option>
            <option>Social</option>
            <option>Meeting</option>
            <option>Outdoors</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Visibility
          <select
            name="visibility"
            className={`${inputClass} mt-2`}
            defaultValue={event?.private ? 'members' : 'public'}
          >
            <option value="public">Public</option>
            <option value="members">Members only</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        Description
        <textarea
          name="description"
          className={`${inputClass} mt-2`}
          rows={4}
          defaultValue={event?.description || ''}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryClass} onClick={onCancel}>
          Cancel
        </button>
        <button className={buttonClass} disabled={busy}>
          {busy ? 'Saving…' : event ? 'Save changes' : 'Publish event'}
        </button>
      </div>
    </form>
  )
}

export default function OrganizationManagePage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') || 'info'
  const activeTab: TabKey = tabs.some((item) => item.key === rawTab)
    ? (rawTab as TabKey)
    : 'info'
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [actorRole, setActorRole] = useState<'student' | 'officer' | 'owner'>(
    'student',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ManagedEvent | null>(null)
  const load = useCallback(async () => {
    const [org, people, metrics, myMemberships] = await Promise.all([
      api<Organization>(`/api/organizations/${organizationId}`),
      api<Member[]>(`/api/organizations/${organizationId}/members`),
      api<Stats>(`/api/organizations/${organizationId}/statistics`),
      api<Membership[]>('/api/memberships/mine'),
    ])
    setOrganization(org)
    setMembers(people)
    setStats(metrics)
    setActorRole(
      myMemberships.find((item) => item.organizationId?._id === organizationId)
        ?.organizationRole || 'student',
    )
  }, [organizationId])
  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(load)
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load organization management.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [load])
  async function saved(message: string) {
    await load()
    setCreatingEvent(false)
    setEditingEvent(null)
    setNotice(message)
    setError('')
  }
  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const data = new FormData(event.currentTarget)
    const preservedAssets = (organization?.assets || []).filter(
      (asset) => !['logo', 'banner'].includes(asset.type.toLowerCase()),
    )
    const assets = [
      ...preservedAssets,
      ...(['logo', 'banner'] as const).flatMap((type) => {
        const link = String(data.get(type) || '').trim()
        return link ? [{ type, link }] : []
      }),
    ]
    try {
      await api(`/api/organizations/${organizationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.get('name'),
          description: data.get('description'),
          category: data.get('category'),
          profile: data.get('profile'),
          membershipFee: Number(data.get('membershipFee')),
          assets,
        }),
      })
      await saved('Changes saved.')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to save organization information.',
      )
    }
  }
  async function updateMember(
    member: Member,
    update: { organizationRole?: 'student' | 'officer'; isPaid?: boolean },
  ) {
    setError('')
    setNotice('')
    try {
      await api(`/api/memberships/${member._id}`, {
        method: 'PATCH',
        body: JSON.stringify(update),
      })
      await load()
      setNotice('Member updated.')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to update member.',
      )
    }
  }
  async function removeMember(member: Member) {
    if (
      !window.confirm(
        `Remove ${member.userId.firstName} ${member.userId.lastName} from this organization?`,
      )
    )
      return
    try {
      await api(`/api/memberships/${member._id}`, { method: 'DELETE' })
      await load()
      setNotice('Member removed.')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to remove member.',
      )
    }
  }
  async function deleteEvent(event: ManagedEvent) {
    if (!window.confirm(`Delete “${event.name}”?`)) return
    try {
      await api(`/api/organizations/${organizationId}/events/${event._id}`, {
        method: 'DELETE',
      })
      await load()
      setNotice('Event deleted.')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to delete the event.',
      )
    }
  }
  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8">
        <p className="text-sm text-muted">Loading organization workspace…</p>
      </div>
    )
  if (!organization)
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8">
        <p role="alert" className="text-sm text-red-700">
          {error || 'Organization not found.'}
        </p>
      </div>
    )
  const nav = tabs.map((item) => ({
    title: item.label,
    onClick: () => setSearchParams({ tab: item.key }),
  }))
  const events = [...(organization.events || [])].sort(
    (a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime),
  )
  const matchingMembers = members.filter((member) =>
    `${member.userId.firstName} ${member.userId.lastName} ${member.userId.email} ${member.organizationRole}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  return (
    <Workspace
      title={organization.name}
      nav={nav}
      active={tabs.find((item) => item.key === activeTab)?.label || 'Info'}
      back={{
        title: 'Back to my clubs',
        onClick: () => navigate('/my-organizations'),
      }}
      action={
        <Link
          to={`/organizations/${organizationId}`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          View organization <span aria-hidden="true">→</span>
        </Link>
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 text-sm text-active">
          {notice}
        </p>
      )}
      {activeTab === 'info' && (
        <section>
          <h1 className="mb-5 text-3xl font-semibold tracking-tight">Info</h1>
          <form
            className={`${panelClass} space-y-4 p-5`}
            onSubmit={(event) => void saveOrganization(event)}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="block text-sm font-medium">
                Name
                <input
                  name="name"
                  className={`${inputClass} mt-2`}
                  defaultValue={organization.name}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Category
                <select
                  name="category"
                  className={`${inputClass} mt-2`}
                  defaultValue={organization.category || 'General'}
                >
                  {[
                    'Technology',
                    'Outdoors',
                    'Arts',
                    'Culture',
                    'Academic',
                    'Community',
                    'General',
                  ].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium">
              Description
              <textarea
                name="description"
                className={`${inputClass} mt-2`}
                rows={4}
                defaultValue={organization.description || ''}
              />
            </label>
            <label className="block text-sm font-medium">
              Website
              <input
                name="profile"
                type="url"
                className={`${inputClass} mt-2`}
                defaultValue={organization.profile || ''}
                placeholder="https://"
              />
            </label>
            <fieldset className="border-t border-line pt-4">
              <legend className="pr-2 text-sm font-semibold">Images</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Icon URL
                  <input
                    name="logo"
                    type="url"
                    className={`${inputClass} mt-2`}
                    defaultValue={
                      organization.assets?.find(
                        (asset) => asset.type.toLowerCase() === 'logo',
                      )?.link || ''
                    }
                    placeholder="https://"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Banner URL
                  <input
                    name="banner"
                    type="url"
                    className={`${inputClass} mt-2`}
                    defaultValue={
                      organization.assets?.find(
                        (asset) => asset.type.toLowerCase() === 'banner',
                      )?.link || ''
                    }
                    placeholder="https://"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted">
                Use a public image link. Images appear in organization discovery
                and details.
              </p>
            </fieldset>
            <label className="block text-sm font-medium">
              Membership dues ($)
              <input
                name="membershipFee"
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} mt-2`}
                defaultValue={organization.membershipFee || 0}
              />
            </label>
            <div className="flex justify-end border-t border-line pt-4">
              <button className={buttonClass}>Save</button>
            </div>
          </form>
        </section>
      )}
      {activeTab === 'events' && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setCreatingEvent((current) => !current)
                setEditingEvent(null)
              }}
            >
              + New event
            </button>
          </div>
          {creatingEvent && (
            <EventEditor
              organizationId={organizationId}
              onSaved={() => void saved('Event published.')}
              onCancel={() => setCreatingEvent(false)}
            />
          )}
          {events.length ? (
            <ul className={`${panelClass} mt-4 divide-y divide-line`}>
              {events.map((event) => (
                <li
                  key={event._id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{event.name}</h2>
                      {event.private && (
                        <span className="rounded bg-paper px-2 py-0.5 text-xs font-semibold text-muted">
                          Members only
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(event.startDatetime).toLocaleDateString(
                        undefined,
                        { month: 'short', day: 'numeric', year: 'numeric' },
                      )}{' '}
                      ·{' '}
                      {new Date(event.startDatetime).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {event.place ? ` · ${event.place}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {event.type && (
                      <span className="text-xs text-muted">{event.type}</span>
                    )}
                    <button
                      className={secondaryClass}
                      onClick={() => {
                        setEditingEvent(event)
                        setCreatingEvent(false)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className={`${secondaryClass} text-red-700`}
                      onClick={() => void deleteEvent(event)}
                    >
                      Delete
                    </button>
                  </div>
                  {editingEvent?._id === event._id && (
                    <div className="w-full">
                      <EventEditor
                        organizationId={organizationId}
                        event={event}
                        onSaved={() => void saved('Event changes saved.')}
                        onCancel={() => setEditingEvent(null)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${panelClass} mt-4 p-4 text-sm text-muted`}>
              No events yet.
            </p>
          )}
        </section>
      )}
      {activeTab === 'members' && (
        <section>
          <h1 className="mb-5 text-3xl font-semibold tracking-tight">
            Members
          </h1>
          <label className="block sm:max-w-sm">
            <span className="sr-only">Search members</span>
            <input
              type="search"
              className={inputClass}
              placeholder="Search members"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {matchingMembers.length ? (
            <div
              className={`${panelClass} mt-4 overflow-x-auto`}
              tabIndex={0}
              role="region"
              aria-label="Member table"
            >
              <table
                className="w-full min-w-[38rem] text-left text-sm"
                aria-label="Organization members"
              >
                <thead className="bg-paper text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Dues</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-t border-line">
                  {matchingMembers.map((member) => (
                    <tr key={member._id} className="hover:bg-paper">
                      <th scope="row" className="px-4 py-3">
                        <span className="font-semibold">
                          {member.userId.firstName} {member.userId.lastName}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-muted">
                          {member.userId.email}
                        </span>
                      </th>
                      <td className="px-4 py-3 text-muted capitalize">
                        {member.organizationRole}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">
                        {member.isPaid ? 'Paid' : 'Unpaid'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {member.organizationRole !== 'owner' && (
                            <>
                              <button
                                className="text-xs font-semibold text-accent hover:underline"
                                onClick={() =>
                                  void updateMember(member, {
                                    organizationRole:
                                      member.organizationRole === 'officer'
                                        ? 'student'
                                        : 'officer',
                                  })
                                }
                              >
                                {member.organizationRole === 'officer'
                                  ? 'Remove officer'
                                  : actorRole === 'owner'
                                    ? 'Make officer'
                                    : ''}
                              </button>
                              {actorRole !== 'student' && (
                                <button
                                  className="text-xs font-semibold text-accent hover:underline"
                                  onClick={() =>
                                    void updateMember(member, {
                                      isPaid: !member.isPaid,
                                    })
                                  }
                                >
                                  {member.isPaid ? 'Mark unpaid' : 'Mark paid'}
                                </button>
                              )}
                              <button
                                className="text-xs font-semibold text-red-700 hover:underline"
                                onClick={() => void removeMember(member)}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={`${panelClass} mt-4 p-4 text-sm text-muted`}>
              No members match your search.
            </p>
          )}
        </section>
      )}
      {activeTab === 'statistics' && (
        <section>
          <h1 className="mb-5 text-3xl font-semibold tracking-tight">
            Statistics
          </h1>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: 'Total members',
                value: stats?.totalMembers ?? members.length,
              },
              {
                label: 'Paid dues',
                value:
                  stats?.paidMembers ??
                  members.filter((member) => member.isPaid).length,
              },
              {
                label: 'Organization events',
                value: stats?.events ?? events.length,
              },
              { label: 'Owners', value: stats?.roles.owner ?? 0 },
              { label: 'Officers', value: stats?.roles.officer ?? 0 },
              { label: 'Members', value: stats?.roles.student ?? 0 },
            ].map((metric) => (
              <article
                key={metric.label}
                className={`${panelClass} p-4 sm:p-5`}
              >
                <h2 className="text-sm font-semibold">{metric.label}</h2>
                <p className="mt-4 text-3xl font-semibold tabular-nums">
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </Workspace>
  )
}
