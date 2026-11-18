import { useState, type ReactNode } from 'react'
import { panelClass } from './styles'

type SortValue = number | string | null

export type TableColumn<T> = {
  key: string
  label: string
  sortValue?: (row: T) => SortValue
  render: (row: T) => ReactNode
}

export function SortablePaginatedTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage,
  label,
}: {
  rows: T[]
  columns: TableColumn<T>[]
  rowKey: (row: T) => string
  emptyMessage: string
  label: string
}) {
  const [sortKey, setSortKey] = useState(columns[0]?.key || '')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [requestedPage, setRequestedPage] = useState(1)

  const sortedRows = [...rows].sort((left, right) => {
    const column = columns.find(({ key }) => key === sortKey)
    if (!column?.sortValue) return 0
    const first = column.sortValue(left)
    const second = column.sortValue(right)
    if (first === null) return second === null ? 0 : 1
    if (second === null) return -1
    const result =
      typeof first === 'number' && typeof second === 'number'
        ? first - second
        : String(first).localeCompare(String(second), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
    return direction === 'asc' ? result : -result
  })

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / 10))
  const page = Math.min(requestedPage, pageCount)
  const pageRows = sortedRows.slice((page - 1) * 10, page * 10)
  const firstRow = sortedRows.length ? (page - 1) * 10 + 1 : 0
  const lastRow = Math.min(page * 10, sortedRows.length)

  function sortBy(column: TableColumn<T>) {
    if (sortKey === column.key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(column.key)
      setDirection('asc')
    }
    setRequestedPage(1)
  }

  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    column.sortValue
                      ? sortKey === column.key
                        ? direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  className="border-b border-line px-4 py-3 font-medium"
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-left hover:text-ink"
                      onClick={() => sortBy(column)}
                    >
                      {column.label}
                      <span aria-hidden="true">
                        {sortKey === column.key
                          ? direction === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageRows.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {!pageRows.length && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
        <p className="text-muted">
          Showing {firstRow}–{lastRow} of {sortedRows.length}
        </p>
        <nav aria-label={`${label} pages`} className="flex items-center gap-3">
          <button
            type="button"
            className="text-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1}
            onClick={() =>
              setRequestedPage((current) => Math.max(1, current - 1))
            }
          >
            Previous
          </button>
          <span aria-live="polite" className="text-muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="text-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= pageCount}
            onClick={() =>
              setRequestedPage((current) => Math.min(pageCount, current + 1))
            }
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  )
}
