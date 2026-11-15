import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { api } from '../lib/api'
import type { Organization } from '../types'
import type { ClubPermission, ClubRole, RoleChange } from '../types/clubRoles'
import type { EditableEvent, Member } from '../types/management'
import { useToast } from './useToast'

async function getWorkspace(
  path: string,
  admin: boolean,
  signal?: AbortSignal,
) {
  const options = { signal }
  const permissions = await api<ClubPermission[]>(
    path + '/manage/permissions',
    options,
  )
  const canReadRoster =
    permissions.includes('members') || permissions.includes('roles')
  const [organization, members, events, roles, history] = await Promise.all([
    api<Organization>(path, options),
    canReadRoster ? api<Member[]>(path + '/members', options) : [],
    permissions.includes('events') || permissions.includes('attendance')
      ? api<EditableEvent[]>(path + '/manage/events', options)
      : [],
    permissions.includes('roles')
      ? api<ClubRole[]>(path + '/roles', options)
      : [],
    admin ? api<RoleChange[]>(path + '/roles/history', options) : undefined,
  ])
  return { organization, members, events, roles, permissions, history }
}

type Workspace = Awaited<ReturnType<typeof getWorkspace>>

export function useOrganizationManagement(
  organizationId: string,
  admin: boolean,
) {
  const { toast } = useToast()
  const [state, setState] = useState<{
    path: string
    data?: Workspace
    error?: string
  }>()
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const path = '/api/organizations/' + organizationId

  useEffect(() => {
    const request = new AbortController()
    void getWorkspace(path, admin, request.signal)
      .then((data) => {
        if (!request.signal.aborted) setState({ path, data })
      })
      .catch((cause: unknown) => {
        if (!request.signal.aborted)
          setState({ path, error: errorMessage(cause) })
      })
    return () => request.abort()
  }, [path, admin])

  const current = state?.path === path ? state : undefined
  const data = current?.data

  async function saved(message: string) {
    toast({ title: message })
    try {
      setState({ path, data: await getWorkspace(path, admin) })
    } catch (cause) {
      toast({
        title: 'Couldn’t refresh the workspace',
        description: errorMessage(cause),
        variant: 'destructive',
      })
    }
  }

  function showError(cause: unknown) {
    toast({ title: errorMessage(cause), variant: 'destructive' })
  }

  async function saveOrganization(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const preservedAssets = (data?.organization.assets ?? []).filter(
      (asset) => !['logo', 'banner'].includes(asset.type.toLowerCase()),
    )
    const updatedAssets = (['logo', 'banner'] as const).flatMap((type) => {
      const link = String(form.get(type) ?? '').trim()
      return link ? [{ type, link }] : []
    })

    try {
      await api(path, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          description: form.get('description'),
          tags: form.getAll('tags'),
          profile: form.get('profile'),
          membershipFee: Number(form.get('membershipFee')),
          assets: [...preservedAssets, ...updatedAssets],
        }),
      })
      await saved('Changes saved')
    } catch (cause) {
      showError(cause)
    } finally {
      setSaving(false)
    }
  }

  async function updateMember(member: Member, isPaid: boolean) {
    try {
      await api('/api/memberships/' + member._id, {
        method: 'PATCH',
        body: JSON.stringify({ isPaid }),
      })
      await saved('Member updated')
    } catch (cause) {
      showError(cause)
    }
  }

  async function removeMember(member: Member) {
    if (
      !window.confirm(
        'Remove ' +
          member.userId.firstName +
          ' ' +
          member.userId.lastName +
          ' from this club?',
      )
    )
      return
    try {
      await api('/api/memberships/' + member._id, { method: 'DELETE' })
      await saved('Member removed')
    } catch (cause) {
      showError(cause)
    }
  }

  async function deleteEvent(event: EditableEvent) {
    if (!window.confirm('Delete “' + (event.name || 'Untitled event') + '”?'))
      return
    try {
      await api(path + '/events/' + event._id, { method: 'DELETE' })
      await saved('Event deleted')
    } catch (cause) {
      showError(cause)
    }
  }

  async function saveRole({ _id, ...role }: ClubRole) {
    await api(path + '/roles' + (_id ? '/' + _id : ''), {
      method: _id ? 'PUT' : 'POST',
      body: JSON.stringify(role),
    })
    await saved('Role saved')
  }

  async function deleteRole(role: ClubRole) {
    if (!window.confirm('Delete “' + role.name + '”?')) return
    try {
      await api(path + '/roles/' + role._id, { method: 'DELETE' })
      await saved('Role deleted')
    } catch (cause) {
      showError(cause)
    }
  }

  async function undoRole(id: string) {
    if (!window.confirm('Undo this role change?')) return
    try {
      await api(path + '/roles/history/' + id + '/undo', { method: 'POST' })
      await saved('Role change undone')
    } catch (cause) {
      showError(cause)
    }
  }

  const events = [...(data?.events ?? [])].sort((a, b) => {
    const first = a.startDatetime ? Date.parse(a.startDatetime) : Infinity
    const second = b.startDatetime ? Date.parse(b.startDatetime) : Infinity
    return first === second ? 0 : first - second
  })
  const matchingMembers = (data?.members ?? []).filter(({ userId, roles }) =>
    [
      userId.firstName,
      userId.lastName,
      userId.email,
      ...roles.map((role) => role.name),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  return {
    organization: data?.organization,
    permissions: data?.permissions ?? [],
    roles: data?.roles ?? [],
    history: data?.history,
    members: data?.members ?? [],
    loading: !current,
    error: current?.error,
    query,
    setQuery,
    events,
    saved,
    deleteEvent,
    matchingMembers,
    updateMember,
    removeMember,
    saving,
    saveOrganization,
    saveRole,
    deleteRole,
    undoRole,
  }
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Something went wrong.'
}

export type OrganizationManagement = ReturnType<
  typeof useOrganizationManagement
>
