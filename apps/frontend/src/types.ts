export type Organization = {
  _id: string
  name: string
  description?: string
  category?: string
  profile?: string | null
  membershipFee?: number
  assets?: { _id?: string; type: string; link: string }[]
  events?: {
    _id: string
    name: string
    description?: string
    startDatetime: string
    endDatetime: string
    place?: string
    type?: string
    private?: boolean
    banner?: string | null
    attendance?: AttendanceSettings
  }[]
}

export type AttendanceSettings = {
  enabled: boolean
  self: boolean
  eventQr: boolean
  attendeeQr: boolean
  walkIns: boolean
}

export type ApiResponse = {
  error?: string
  message?: string
  token?: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

export type AuthUser = {
  id?: string
  firstName: string
  lastName: string
  email?: string
  role?: string
}

export type Application = {
  _id: string
  userId: AuthUser | string
  organizationName: string
  organizationDescription?: string | null
  category?: string
  contactEmail?: string | null
  link?: string | null
  additionalDocuments: { _id?: string; name: string; link: string }[]
  status: 'pending' | 'approved' | 'denied'
  reviewedAt?: string | null
  createdAt: string
}
