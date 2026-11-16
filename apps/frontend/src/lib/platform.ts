import { Capacitor } from '@capacitor/core'

export const isNativeApp = Capacitor.isNativePlatform()

const webOrigin = import.meta.env.VITE_HILT_WEB_ORIGIN

export function apiUrl(path: string) {
  if (!isNativeApp) return path

  const origin = import.meta.env.VITE_HILT_API_ORIGIN ?? webOrigin
  if (!origin) throw new Error('The app’s server address is missing.')
  const url = new URL(path, origin)
  if (url.protocol !== 'https:' && import.meta.env.MODE !== 'mobile-local')
    throw new Error('The app’s server requires HTTPS.')
  return url.href
}

export function publicUrl(path: string) {
  return new URL(path, isNativeApp ? webOrigin : window.location.origin)
}

export function mediaUrl(src: string) {
  return src.startsWith('/api/media/') ? apiUrl(src) : src
}

export function parseUrl(value: string) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export function routeFromAppLink(value?: string) {
  const url = value && parseUrl(value)
  if (!url || url.origin !== publicUrl('/').origin) return null

  if (
    (url.pathname === '/' && url.searchParams.has('club')) ||
    url.pathname === '/scan' ||
    /^\/organizations\/[a-f\d]{24}$/i.test(url.pathname)
  ) {
    return url.pathname + url.search
  }
  return null
}
