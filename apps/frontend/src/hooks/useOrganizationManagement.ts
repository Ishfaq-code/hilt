import type { SubmitEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Organization } from '../types'
import type {
  ManagedEvent,
  Member,
  Membership,
  Stats,
} from '../types/management'

export function useOrganizationManagement(organizationId: string) {
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

  async function saveOrganization(event: SubmitEvent<HTMLFormElement>) {
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

  const events = [...(organization?.events || [])].sort(
    (a, b) => Date.parse(a.startDatetime) - Date.parse(b.startDatetime),
  )
  const matchingMembers = members.filter((member) =>
    `${member.userId.firstName} ${member.userId.lastName} ${member.userId.email} ${member.organizationRole}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  return {
    organization,
    loading,
    error,
    notice,
    saveOrganization,
    events,
    creatingEvent,
    setCreatingEvent,
    editingEvent,
    setEditingEvent,
    saved,
    deleteEvent,
    matchingMembers,
    query,
    setQuery,
    updateMember,
    removeMember,
    actorRole,
    stats,
    members,
  }
}

export type OrganizationManagement = ReturnType<
  typeof useOrganizationManagement
>
