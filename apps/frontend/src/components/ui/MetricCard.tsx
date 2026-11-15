type Props = { label: string; value: number | string; detail?: string }

export default function MetricCard({ label, value, detail }: Props) {
  return (
    <article className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <strong className="mt-4 block text-3xl font-semibold tabular-nums">
        {value}
      </strong>
      {detail && (
        <span className="mt-1 block text-xs text-muted">{detail}</span>
      )}
    </article>
  )
}
