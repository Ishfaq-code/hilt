import { Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import AccountPage from './pages/AccountPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ApplicationPage from './pages/ApplicationPage'
import AuthEntryPage from './pages/AuthEntryPage'
import CheckInPage from './pages/CheckInPage'
import ClubSearchPage from './pages/ClubSearchPage'
import HomePage from './pages/HomePage'
import EventsPage from './pages/EventsPage'
import MyOrganizationsPage from './pages/MyOrganizationsPage'
import OrganizationsPage from './pages/OrganizationsPage'
import OrganizationManagePage from './pages/OrganizationManagePage'
import ClubPreviewRedirect from './pages/ClubPreviewRedirect'

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<ClubSearchPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/login" element={<AuthEntryPage mode="login" />} />
        <Route path="/register" element={<AuthEntryPage mode="register" />} />
        <Route path="/qr" element={<CheckInPage key="qr" mode="qr" />} />
        <Route path="/scan" element={<CheckInPage key="scan" mode="scan" />} />
        <Route path="/application" element={<ApplicationPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/my-organizations" element={<MyOrganizationsPage />} />
        <Route
          path="/organizations/:organizationId"
          element={<ClubPreviewRedirect />}
        />
        <Route
          path="/organizations/:organizationId/manage"
          element={<OrganizationManagePage />}
        />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route
          path="/admin/organizations/:organizationId/manage"
          element={<OrganizationManagePage admin />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
