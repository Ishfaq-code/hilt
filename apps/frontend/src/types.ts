export type Organization = {
  _id: string
  name: string
  description?: string
  assets?: string[]
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
