import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequireRole,
} from './components/guards/RouteGuards'

import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage'

import { DashboardPage } from './pages/DashboardPage'
import { OwnersPage } from './pages/owners/OwnersPage'
import { OwnerDetailPage } from './pages/owners/OwnerDetailPage'
import { PetsPage } from './pages/pets/PetsPage'
import { PetDetailPage } from './pages/pets/PetDetailPage'
import { VaccinationsPage } from './pages/vaccinations/VaccinationsPage'
import { MedicalRecordsPage } from './pages/records/MedicalRecordsPage'
import { ClinicsPage } from './pages/clinics/ClinicsPage'
import { SettingsPage } from './pages/clinics/SettingsPage'
import { StaffPage } from './pages/staff/StaffPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      {/* ---- Public ------------------------------------------------- */}
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <RedirectIfAuthenticated>
            <ForgotPasswordPage />
          </RedirectIfAuthenticated>
        }
      />
      {/*
        These two paths are dictated by the backend: `services.py` builds
        `{FRONTEND_URL}/reset-password/{uid}/{token}` and
        `{FRONTEND_URL}/invite/{token}` into the emails it sends. Changing
        them here breaks every link already in someone's inbox.
      */}
      <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      {/* ---- Authenticated ------------------------------------------ */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="/owners" element={<OwnersPage />} />
        <Route path="/owners/:id" element={<OwnerDetailPage />} />

        <Route path="/pets" element={<PetsPage />} />
        <Route path="/pets/:id" element={<PetDetailPage />} />

        <Route path="/vaccinations" element={<VaccinationsPage />} />
        <Route path="/medical-records" element={<MedicalRecordsPage />} />

        <Route path="/clinics" element={<ClinicsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route
          path="/staff"
          element={
            <RequireRole allow={['ADMIN']}>
              <StaffPage />
            </RequireRole>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Unauthenticated 404s (e.g. a typo'd public link). */}
      <Route path="*" element={<NotFoundPage standalone />} />
    </Routes>
  )
}
