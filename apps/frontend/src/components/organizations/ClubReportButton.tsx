import { useState } from 'react'
import { clubPath } from '../../lib/events'
import { ReportDialog } from '../reports/ReportDialog'
import { textActionClass } from '../ui/styles'

export function ClubReportButton({ clubId }: { clubId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={textActionClass}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Report
      </button>
      {open && (
        <ReportDialog
          endpoint={'/api' + clubPath(clubId) + '/reports'}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
