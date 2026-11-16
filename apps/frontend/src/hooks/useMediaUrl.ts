import { mediaUrl } from '../lib/platform'
import { useEffect, useState } from 'react'
import { apiFile } from '../lib/api'
import { useAuthToken } from './useAuthToken'

export function useMediaUrl(src?: string | null, authenticated = false) {
  const token = useAuthToken()
  const managed = authenticated && src?.startsWith('/api/media/')
  const [image, setImage] = useState<{
    src: string
    url: string
    token: string | null
  }>()

  useEffect(() => {
    if (!src || !managed) return
    const request = new AbortController()
    let url: string | undefined
    void apiFile(src, request.signal)
      .then((blob) => {
        if (request.signal.aborted) return
        url = URL.createObjectURL(blob)
        setImage({ src, url, token })
      })
      .catch(() => {})
    return () => {
      request.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [src, managed, token])

  if (!managed) return src ? mediaUrl(src) : src
  if (image && image.src === src && image.token === token) return image.url
}
