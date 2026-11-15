export function EventBanner({
  src,
  className,
  loading = 'lazy',
}: {
  src?: string | null
  className: string
  loading?: 'eager' | 'lazy'
}) {
  if (!src) return null

  return (
    <img
      src={src}
      alt=""
      loading={loading}
      decoding="async"
      className={`block object-cover ${className}`}
    />
  )
}
