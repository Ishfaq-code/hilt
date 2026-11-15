import { Outlet } from 'react-router-dom'
import { RouteAuthDialog } from '../auth/RouteAuthDialog'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

export function SiteLayout() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="site-content">
        <Outlet />
      </main>
      <SiteFooter />
      <RouteAuthDialog />
    </div>
  )
}
