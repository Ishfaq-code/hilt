type Props = {
  label: string
  value: number | string
  detail?: string
  centered?: boolean
}

export default function MetricCard({
  label,
  value,
  detail,
  centered = false,
}: Props) {
  return (
    <article
      className={`rounded-xl border border-line bg-white ${centered ? 'flex min-h-36 flex-col items-center justify-center p-6 text-center' : 'p-4 sm:p-5'}`}
    >
      <p
        className={`text-sm text-muted ${centered ? 'flex min-h-12 items-center justify-center' : ''}`}
      >
        {label}
      </p>
      <strong
        className={`${centered ? 'mt-3' : 'mt-4'} block text-3xl font-semibold tabular-nums`}
      >
        {value}
      </strong>
      {detail && (
        <span className="mt-1 block text-xs text-muted">{detail}</span>
      )}
    </article>
  )
}
