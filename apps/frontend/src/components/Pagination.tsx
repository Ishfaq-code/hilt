type Props = {
  offset: number
  total: number
  href: (offset: number) => string
  previousLabel?: string
  nextLabel?: string
}

export default function Pagination({
  offset,
  total,
  href,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: Props) {
  if (total <= 20) {
    return null
  }

  return (
    <div className="pagination">
      {offset > 0 ? (
        <a href={href(Math.max(0, offset - 20))}>{previousLabel}</a>
      ) : (
        <span className="secondary">{previousLabel}</span>
      )}

      <span>
        {offset + 1}–{Math.min(offset + 20, total)} of {total}
      </span>

      {offset + 20 < total ? (
        <a href={href(offset + 20)}>{nextLabel}</a>
      ) : (
        <span className="secondary">{nextLabel}</span>
      )}
    </div>
  )
}
