import type { ReactNode } from 'react'

import ClubDialogs from './ClubDialogs'
import type { ClubWorkspace } from '../hooks/useClubWorkspace'

type Props = {
  title: string
  workspace: ClubWorkspace
  description?: string
  back?: { href: string; label: string }
  hideRefresh?: boolean
  children: ReactNode
}

export default function PageFrame({
  title,
  workspace,
  description,
  back,
  hideRefresh = false,
  children,
}: Props) {
  const { loading, data, notice, error, modal, refresh } = workspace

  return (
    <>
      {back && (
        <a className="page-back" href={back.href}>← {back.label}</a>
      )}

      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>

        {!hideRefresh && (
          <button className="quiet-button" disabled={loading} onClick={refresh}>
            Refresh
          </button>
        )}
      </div>

      {notice && <p className="notice" role="status">{notice}</p>}

      {error && !modal && (
        <div className="error" role="alert">
          {error}{' '}
          <button className="text-button" onClick={refresh}>Retry</button>
        </div>
      )}

      {loading ? <p role="status">Loading clubs…</p> : data && children}

      <ClubDialogs workspace={workspace} />
    </>
  )
}
