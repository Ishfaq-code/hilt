import type { RefObject } from 'react'

export function Pagination({
  label,
  page,
  pageCount,
  onPageChange,
  headingRef,
}: {
  label: string
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  if (pageCount <= 1) return null

  function goToPage(nextPage: number) {
    onPageChange(nextPage)
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'instant',
    })
  }

  const buttonClass =
    'min-h-10 text-sm text-accent disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <nav
      aria-label={`${label} pages`}
      className="mt-3 flex items-center justify-end gap-4"
    >
      <button
        type="button"
        className={buttonClass}
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
      >
        Previous
      </button>
      <span aria-live="polite" className="text-sm text-muted">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={page >= pageCount}
        onClick={() => goToPage(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
