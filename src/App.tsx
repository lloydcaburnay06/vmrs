import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { apiBasePrefix, navigationSections } from './config'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import DriverSchedulesPage from './pages/DriverSchedulesPage'
import TripLogsPage from './pages/TripLogsPage'
import DriverWorkSchedulesPage from './pages/DriverWorkSchedulesPage'
import TravelRequestsPage from './pages/TravelRequestsPage'
import UsersPage from './pages/UsersPage'
import DriversPage from './pages/DriversPage'
import VehiclesPage from './pages/VehiclesPage'
import MaintenanceRecordsPage from './pages/MaintenanceRecordsPage'
import FuelLogsPage from './pages/FuelLogsPage'
import LocationsPage from './pages/LocationsPage'
import VehicleTypesPage from './pages/VehicleTypesPage'
import ReportsPage from './pages/ReportsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import SettingsPage from './pages/SettingsPage'
import RegisterPage from './pages/RegisterPage'
import RegistrationApprovalsPage from './pages/RegistrationApprovalsPage'
import PasswordField from './components/PasswordField'
import type { AuthUser } from './types'
import brandLogo from './assets/brand-logo-ui.png'

async function readJson<T>(response: Response): Promise<T | null> {
  const body = await response.text()

  if (body.trim() === '') {
    return null
  }

  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}

function canAccessNavItem(label: string, role: string) {
  if (['Users', 'Registrations', 'Drivers'].includes(label)) {
    return role === 'admin' || (label === 'Drivers' && role === 'cao')
  }

  if (['Vehicles', 'Maintenance', 'Fuel Logs', 'Locations', 'Vehicle Types'].includes(label)) {
    if (['Vehicles', 'Maintenance'].includes(label)) {
      return role === 'admin' || role === 'manager' || role === 'cao'
    }

    return role === 'admin' || role === 'manager'
  }

  if (label === 'Reports') {
    return role === 'admin' || role === 'manager'
  }

  if (label === 'Audit Logs') {
    return role === 'admin' || role === 'manager'
  }

  if (['Driver Schedules', 'Driver Work Schedules', 'Trip Logs'].includes(label)) {
    if (label === 'Trip Logs') {
      return role === 'admin' || role === 'manager' || role === 'driver' || role === 'cao'
    }

    return role === 'admin' || role === 'manager' || role === 'driver'
  }

  return true
}

function SectionIcon({ label, active }: { label: string; active: boolean }) {
  const toneClass = active ? 'text-white' : 'text-teal-700'

  if (label === 'Operations') {
    return (
      <svg aria-hidden="true" className={`h-4 w-4 ${toneClass}`} fill="none" viewBox="0 0 24 24">
        <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (label === 'Fleet') {
    return (
      <svg aria-hidden="true" className={`h-4 w-4 ${toneClass}`} fill="none" viewBox="0 0 24 24">
        <path
          d="M4 15V9a2 2 0 0 1 2-2h7l4 4h1a2 2 0 0 1 2 2v2M7 17.5a1.5 1.5 0 1 0 0 .01M17 17.5a1.5 1.5 0 1 0 0 .01M8.5 17.5h7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className={`h-4 w-4 ${toneClass}`} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.5 5.5 7.2v4.1c0 4.1 2.6 7.8 6.5 9.2 3.9-1.4 6.5-5.1 6.5-9.2V7.2L12 4.5Zm-2.4 7h4.8M9.6 14.4h4.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ItemIcon({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
        active
          ? 'border-white/20 bg-white/12 text-white'
          : 'border-teal-100 bg-teal-50 text-teal-700'
      }`}
    >
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M9 6.75 15 12l-6 5.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </span>
  )
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const response = await fetch(`${apiBasePrefix}/api/auth/me`)
        if (!response.ok) {
          setUser(null)
          return
        }

        const payload = await readJson<{ user?: AuthUser }>(response)
        setUser(payload?.user ?? null)
      } catch {
        setUser(null)
      } finally {
        setBooting(false)
      }
    }

    bootstrapAuth().catch(() => setBooting(false))
  }, [])

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-slate-600">
        <div className="surface px-6 py-4">Checking session...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        element={
          user ? <Navigate replace to="/dashboard" /> : <LoginPage onLoginSuccess={(authUser) => setUser(authUser)} />
        }
        path="/login"
      />
      <Route element={user ? <Navigate replace to="/dashboard" /> : <RegisterPage />} path="/register" />

      <Route
        element={
          user ? (
            <AdminShell
              onProfileUpdated={(nextUser) => setUser(nextUser)}
              onLogout={() => setUser(null)}
              user={user}
            />
          ) : (
            <Navigate replace to="/login" />
          )
        }
        path="/*"
      />
    </Routes>
  )
}

function LoginPage({ onLoginSuccess }: { onLoginSuccess: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`${apiBasePrefix}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const payload = await readJson<{ error?: string; user?: AuthUser }>(response)

      if (!response.ok || !payload?.user) {
        if (payload?.error) {
          setError(payload.error)
          return
        }

        if (!response.ok) {
          setError(`Login endpoint returned ${response.status}`)
          return
        }

        setError('Login failed')
        return
      }

      onLoginSuccess(payload.user)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Unable to connect to login endpoint')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,227,74,0.24),_transparent_25%),linear-gradient(135deg,_#f4fbfb_0%,_#d8f4e7_46%,_#e2eefc_100%)]">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(14,165,166,0.18),_transparent_60%)]" />
      <div className="absolute left-[-5rem] top-20 h-44 w-44 rounded-full bg-emerald-400/18 blur-3xl" />
      <div className="absolute bottom-10 right-[-3rem] h-52 w-52 rounded-full bg-blue-500/12 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-3 py-3 md:px-4 md:py-4">
        <div className="grid w-full gap-4 lg:h-[calc(100vh-2rem)] lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="overflow-hidden rounded-[28px] border border-emerald-200/80 bg-white/78 p-5 shadow-[0_24px_80px_rgba(4,35,50,0.14)] backdrop-blur md:p-7 lg:flex lg:h-full lg:flex-col lg:justify-between lg:p-8">
            <div>
              <div className="inline-flex rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                MRH Transport Portal
              </div>
              <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
                Vehicle reservations and dispatch for Margosatubig Regional Hospital.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                A single workspace for travel requests, driver schedules, and transport coordination for authorized MRH
                personnel.
              </p>
            </div>

            <div className="mt-6 grid items-center gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="relative mx-auto w-full max-w-[240px]">
                <div className="absolute inset-4 rounded-full bg-[conic-gradient(from_0deg,_rgba(14,165,166,0.3),_rgba(37,99,235,0.22),_rgba(250,204,21,0.28),_rgba(34,197,94,0.24),_rgba(14,165,166,0.3))] blur-2xl" />
                <div className="relative rounded-[28px] border border-white/80 bg-white/76 p-3 shadow-[0_18px_50px_rgba(15,118,110,0.14)]">
                  <img
                    alt="Margosatubig Regional Hospital logo"
                    className="w-full rounded-[24px] object-contain"
                    src={brandLogo}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Hospital Use</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Access reservations, schedules, and assignment workflows from one secure MRH sign-in.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-4 text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Dispatch</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">Track requests and driver availability.</p>
                  </div>
                  <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-4 text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Admin</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">Manage vehicles, users, and approvals.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,_rgba(3,23,39,0.96),_rgba(8,47,73,0.96))] p-5 text-white shadow-[0_28px_90px_rgba(2,6,23,0.34)] md:p-7 lg:flex lg:h-full lg:flex-col lg:justify-center lg:p-8">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-white/15 bg-white/8 p-2">
                <img
                  alt="Margosatubig Regional Hospital icon"
                  className="h-14 w-14 rounded-xl object-cover"
                  src={brandLogo}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">VMRS Access</p>
                <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Secure sign in</h2>
              </div>
            </div>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Sign in with your authorized MRH account to access reservations, dispatch coordination, and records.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
                  Email
                </label>
                <input
                  autoComplete="username"
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@mrh.local"
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
                  Password
                </label>
                <PasswordField
                  autoComplete="current-password"
                  inputClassName="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  value={password}
                />
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-400/40 bg-red-500/12 px-4 py-3 text-sm font-medium text-red-100">
                  {error}
                </p>
              ) : null}

              <button
                className="w-full rounded-2xl bg-[linear-gradient(135deg,_#0ea5a6,_#2563eb)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={submitting}
                type="submit"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-sm text-slate-300">
              Need an account?{' '}
              <Link className="font-semibold text-cyan-200 transition hover:text-cyan-100" to="/register">
                Submit a registration request
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-left">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Authorized Access</p>
              <p className="mt-2 text-sm text-slate-200">Margosatubig Regional Hospital personnel only.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function AdminShell({
  user,
  onLogout,
  onProfileUpdated,
}: {
  user: AuthUser
  onLogout: () => void
  onProfileUpdated: (user: AuthUser) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [activeSectionLabel, setActiveSectionLabel] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const visibleSections = useMemo(
    () =>
      navigationSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccessNavItem(item.label, user.role)),
        }))
        .filter((section) => section.items.length > 0),
    [user.role],
  )

  useEffect(() => {
    setMenuOpen(false)
    const activeSection = visibleSections.find((section) =>
      section.items.some((item) => item.path === location.pathname),
    )

    if (activeSection) {
      setActiveSectionLabel(activeSection.label)
      setOpenSections((prev) => ({
        ...prev,
        [activeSection.label]: true,
      }))
    } else if (visibleSections.length > 0 && activeSectionLabel === '') {
      setActiveSectionLabel(visibleSections[0].label)
    }
  }, [location.pathname, visibleSections])

  const activeDesktopSection =
    visibleSections.find((section) => section.label === activeSectionLabel) ?? visibleSections[0] ?? null

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      await fetch(`${apiBasePrefix}/api/auth/logout`, {
        method: 'POST',
      })
    } finally {
      onLogout()
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen overflow-y-auto p-4 md:p-6 lg:overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-4 md:min-h-[calc(100vh-3rem)] md:gap-6 lg:h-[calc(100vh-3rem)] lg:max-w-none lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className={`surface ${menuOpen ? 'block' : 'hidden'} max-h-[calc(100vh-2rem)] overflow-y-auto p-4 md:max-h-[calc(100vh-3rem)] lg:max-h-none lg:flex lg:h-full lg:flex-col lg:overflow-hidden`}>
          <div className="mb-6 flex items-center gap-3 border-b border-teal-100 pb-4">
            <div className="overflow-hidden rounded-xl border border-teal-100 bg-white p-1 shadow-sm">
              <img
                alt="Margosatubig Regional Hospital logo"
                className="h-10 w-10 rounded-lg object-cover"
                src={brandLogo}
              />
            </div>
            <div>
              <p className="text-sm text-slate-500">Admin Panel</p>
              <h1 className="text-lg font-semibold">MRH VMRS Portal</h1>
            </div>
          </div>

          <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <nav className="space-y-3 pr-1 lg:hidden lg:flex-1 lg:overflow-y-auto">
              {visibleSections.map((section) => {
                const isOpen = openSections[section.label] ?? section.label === 'Operations'

                return (
                  <div className="rounded-2xl border border-teal-100/80 bg-teal-50/45 p-2" key={section.label}>
                    <button
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 transition hover:bg-white/70"
                      onClick={() =>
                        setOpenSections((prev) => ({
                          ...prev,
                          [section.label]: !isOpen,
                        }))
                      }
                      type="button"
                    >
                      <span>{section.label}</span>
                      <span className="text-[11px] text-teal-700">{isOpen ? 'Hide' : 'Show'}</span>
                    </button>

                    {isOpen ? (
                      <div className="mt-2 space-y-1">
                        {section.items.map((item) => {
                          const active = location.pathname === item.path

                          return (
                            <Link
                              className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                                active
                                  ? 'bg-teal-700 text-white shadow-sm'
                                  : 'text-slate-700 hover:bg-white hover:text-teal-800'
                              }`}
                              key={item.path}
                              to={item.path}
                            >
                              {item.label}
                            </Link>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </nav>

            <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <div className="rounded-[26px] border border-teal-100 bg-[linear-gradient(180deg,_rgba(247,254,252,0.98),_rgba(255,255,255,0.98))] p-2 shadow-sm">
                <div className="grid grid-cols-1 gap-1">
                  {visibleSections.map((section) => {
                    const active = activeDesktopSection?.label === section.label

                    return (
                      <button
                        className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                          active
                            ? 'bg-[linear-gradient(135deg,_#0f766e,_#155e75)] text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)]'
                            : 'text-slate-500 hover:bg-white hover:text-teal-800'
                        }`}
                        key={section.label}
                        onClick={() => setActiveSectionLabel(section.label)}
                        type="button"
                      >
                        <SectionIcon active={active} label={section.label} />
                        <span>{section.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {activeDesktopSection ? (
                <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-teal-100 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <div className="border-b border-teal-100 bg-[linear-gradient(135deg,_rgba(240,253,250,0.75),_rgba(239,246,255,0.65))] px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-teal-200 bg-white/80">
                        <SectionIcon active={false} label={activeDesktopSection.label} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
                          Section
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {activeDesktopSection.label}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {activeDesktopSection.items.length} module{activeDesktopSection.items.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <div className="space-y-1.5">
                      {activeDesktopSection.items.map((item) => {
                        const active = location.pathname === item.path

                        return (
                          <Link
                            className={`group block rounded-2xl border px-3 py-2.5 transition ${
                              active
                                ? 'border-teal-700 bg-[linear-gradient(135deg,_#0f766e,_#155e75)] text-white shadow-[0_10px_20px_rgba(15,118,110,0.18)]'
                                : 'border-slate-100 bg-white text-slate-700 hover:border-teal-100 hover:bg-teal-50/70 hover:text-teal-900'
                            }`}
                            key={item.path}
                            to={item.path}
                          >
                            <div className="flex items-center gap-3">
                              <ItemIcon active={active} />
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{item.label}</span>
                                <span
                                  className={`block truncate text-[11px] ${
                                    active ? 'text-teal-100' : 'text-slate-400 group-hover:text-teal-700'
                                  }`}
                                >
                                  Open module
                                </span>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 border-t border-teal-100 pt-4 text-center lg:mt-auto">
              <p className="text-xs uppercase tracking-wide text-slate-500">Profile Management</p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Link
                  className="rounded-xl border border-teal-200 px-3 py-2 text-center text-sm font-medium text-teal-800 transition hover:bg-teal-50"
                  to="/settings"
                >
                  Edit Profile
                </Link>
                <button
                  className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  type="button"
                >
                  {loggingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="surface flex min-h-0 flex-col overflow-hidden">
          <header className="border-b border-teal-100 px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {activeDesktopSection?.label ?? 'Operations'}
                </p>
                <h2 className="text-lg font-semibold sm:text-xl">MRH Fleet Operations</h2>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                <span className="chip block max-w-full truncate text-center sm:text-left">
                  {user.first_name} {user.last_name}
                  <span className="hidden md:inline"> ({user.role})</span>
                </span>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800 lg:hidden"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    type="button"
                  >
                    Menu
                  </button>
                </div>
              </div>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <Routes>
              <Route element={<DashboardPage />} path="/dashboard" />
              <Route element={<CalendarPage />} path="/calendar" />
              <Route element={<DriverSchedulesPage currentUser={user} />} path="/driver-schedules" />
              <Route element={<TripLogsPage currentUser={user} />} path="/trip-logs" />
              <Route element={<DriverWorkSchedulesPage currentUser={user} />} path="/driver-work-schedules" />
              <Route element={<TravelRequestsPage currentUser={user} />} path="/travel-requests" />
              <Route element={<RegistrationApprovalsPage currentUser={user} />} path="/registrations" />
              <Route element={<UsersPage currentUser={user} />} path="/users" />
              <Route element={<DriversPage currentUser={user} />} path="/drivers" />
              <Route element={<VehiclesPage currentUser={user} />} path="/vehicles" />
              <Route element={<MaintenanceRecordsPage currentUser={user} />} path="/maintenance-records" />
              <Route element={<FuelLogsPage currentUser={user} />} path="/fuel-logs" />
              <Route element={<LocationsPage currentUser={user} />} path="/locations" />
              <Route element={<VehicleTypesPage currentUser={user} />} path="/vehicle-types" />
              <Route element={<ReportsPage currentUser={user} />} path="/reports" />
              <Route element={<AuditLogsPage currentUser={user} />} path="/audit-logs" />
              <Route
                element={<SettingsPage currentUser={user} onProfileUpdated={onProfileUpdated} />}
                path="/settings"
              />
              <Route element={<Navigate replace to="/dashboard" />} path="*" />
            </Routes>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
