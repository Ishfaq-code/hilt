import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import ApplicationPage from './pages/ApplicationPage'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import MyOrganizationsPage from './pages/MyOrganizationsPage'
import OrganizationPage from './pages/OrganizationPage'
import OrganizationManagePage from './pages/OrganizationManagePage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import SiteFooter from './components/SiteFooter'
import SiteHeader from './components/SiteHeader'

function SiteLayout() {
  return <div className="site-shell"><SiteHeader /><main className="site-content"><Outlet /></main><SiteFooter /></div>
}

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage initialMode="login" />} />
        <Route path="/register" element={<AuthPage initialMode="signup" />} />
        <Route path="/application" element={<ApplicationPage />} />
        <Route path="/my-organizations" element={<MyOrganizationsPage />} />
        <Route path="/organizations/:organizationId" element={<OrganizationPage />} />
        <Route path="/organizations/:organizationId/manage" element={<OrganizationManagePage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
