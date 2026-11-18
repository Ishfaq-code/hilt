import type { Membership } from '../types/management'
import { api } from './api'

export function clubPreviewPath(clubId: string, eventId?: string) {
  const params = new URLSearchParams({ club: clubId })
  if (eventId) params.set('event', eventId)
  return '/?' + params
}

export function myClubPath(clubId: string, tab?: 'events') {
  const params = new URLSearchParams({ club: clubId })
  if (tab) params.set('tab', tab)
  return '/my-organizations?' + params
}

export async function joinClub(clubId: string) {
  try {
    await api('/api/memberships', {
      method: 'POST',
      body: JSON.stringify({ organizationId: clubId }),
    })
    return true
  } catch (cause) {
    const memberships = await api<Membership[]>('/api/memberships/mine').catch(
      () => [],
    )
    if (
      !memberships.some(
        (membership) => membership.organizationId?._id === clubId,
      )
    ) {
      throw cause
    }
    return false
  }
}
