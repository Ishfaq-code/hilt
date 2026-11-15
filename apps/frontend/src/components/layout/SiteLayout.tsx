import { Outlet } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { RouteAuthDialog } from '../auth/RouteAuthDialog'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

export function SiteLayout() {
  const { user, token } = useCurrentUser()
  const showApply = !token || user?.role === 'user'

  return (
    <div className="site-shell">
      <SiteHeader user={user} showApply={showApply} />
      <main className="site-content">
        <Outlet />
      </main>
      <SiteFooter showApply={showApply} />
      <RouteAuthDialog />
    </div>
  )
}
