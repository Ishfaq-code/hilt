import { useMediaUrl } from '../../hooks/useMediaUrl'

export function EventBanner({
  src,
  className,
  loading = 'lazy',
}: {
  src?: string | null
  className: string
  loading?: 'eager' | 'lazy'
}) {
  const url = useMediaUrl(src, true)
  if (!url) return null

  return (
    <img
      src={url}
      alt=""
      loading={loading}
      decoding="async"
      className={`block object-cover ${className}`}
    />
  )
}
