import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom'

type DashboardSummary = {
  revenue: string
  orders: number
  users: number
  conversionRate: string
  latestOrders: Array<{
    id: string
    customer: string
    amount: string
    status: string
  }>
}

type AuthUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
}

type ManagedUser = {
  id: number
  role_id: number
  role_name: string
  employee_no: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

type RoleOption = {
  id: number
  name: string
}

type VehicleOption = {
  id: number
  name: string
  assignment_type?: 'administrative' | 'ambulance'
}

type ManagedVehicle = {
  id: number
  vehicle_code: string
  plate_no: string
  vin: string | null
  type_id: number
  type_name: string
  service_type: 'ambulance' | 'administrative'
  current_location_id: number | null
  location_name: string | null
  make: string
  model: string
  year: number | null
  color: string | null
  transmission: string | null
  fuel_type: string | null
  seats: number | null
  payload_kg: string | null
  odometer_km: string
  status: 'available' | 'reserved' | 'in_use' | 'maintenance' | 'inactive'
  registration_expiry: string | null
  insurance_expiry: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type ManagedDriver = {
  id: number
  employee_no: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  dl_id_number: string | null
  license_expiry: string | null
  assignment_type: 'administrative' | 'ambulance'
  created_at: string
  updated_at: string
}

type TravelRequestItem = {
  id: number
  reservation_no: string
  vehicle_id: number
  vehicle_code: string
  plate_no: string
  vehicle_name: string
  requester_id: number
  requester_name: string
  approver_id: number | null
  approver_name: string | null
  assigned_driver_id: number | null
  driver_name: string | null
  pickup_location_id: number | null
  pickup_location_name: string | null
  dropoff_location_id: number | null
  dropoff_location_name: string | null
  purpose: string
  destination: string | null
  start_at: string
  end_at: string
  passengers: number | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'completed' | 'no_show'
  rejection_reason: string | null
  remarks: string | null
  approved_at: string | null
  assigned_at: string | null
  created_at: string
  updated_at: string
}

type CalendarTravelItem = {
  id: number
  reservation_no: string
  start_at: string
  end_at: string
  purpose: string
  destination: string | null
  vehicle_code: string
  vehicle_name: string
  requester_name: string
  driver_name: string | null
  pickup_location_name: string | null
  dropoff_location_name: string | null
}

type DriverScheduleItem = {
  id: number
  reservation_no: string
  status: 'approved' | 'active' | 'completed'
  start_at: string
  end_at: string
  purpose: string
  destination: string | null
  assigned_driver_id: number | null
  driver_name: string | null
  vehicle_id: number
  vehicle_code: string
  vehicle_name: string
  requester_name: string
}

type DriverWorkScheduleItem = {
  id: number
  driver_id: number
  driver_name: string
  work_date: string
  start_time: string | null
  end_time: string | null
  shift_code?: 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE'
  shift_type: 'regular' | 'overtime' | 'off' | 'leave'
  status: 'scheduled' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

const navigation = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Driver Schedules', path: '/driver-schedules' },
  { label: 'Driver Work Schedules', path: '/driver-work-schedules' },
  { label: 'Travel Requests', path: '/travel-requests' },
  { label: 'Users', path: '/users' },
  { label: 'Drivers', path: '/drivers' },
  { label: 'Vehicles', path: '/vehicles' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' },
]

const apiBasePrefix = (() => {
  const marker = '/admin'
  const index = window.location.pathname.indexOf(marker)
  return index > 0 ? window.location.pathname.slice(0, index) : ''
})()

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

        const payload = (await response.json()) as { user: AuthUser }
        setUser(payload.user)
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

      <Route
        element={
          user ? (
            <AdminShell
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
  const [email, setEmail] = useState('admin@vmrs.local')
  const [password, setPassword] = useState('password123')
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

      const payload = (await response.json()) as { error?: string; user?: AuthUser }

      if (!response.ok || !payload.user) {
        setError(payload.error ?? 'Login failed')
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
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="surface w-full max-w-md p-6 md:p-8">
        <p className="text-xs uppercase tracking-wide text-teal-700">VMRS Access</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">General User Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to access vehicle reservations and admin modules.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <button
            className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AdminShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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

  const navItems = navigation.filter((item) => {
    if (['Users', 'Drivers', 'Vehicles'].includes(item.label)) {
      return user.role === 'admin' || user.role === 'manager'
    }

    return true
  })

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`surface ${menuOpen ? 'block' : 'hidden'} p-4 lg:block`}>
          <div className="mb-6 flex items-center gap-3 border-b border-teal-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-teal-700 text-center text-xl font-bold leading-10 text-white">V</div>
            <div>
              <p className="text-sm text-slate-500">Admin Panel</p>
              <h1 className="text-lg font-semibold">VMRS Portal</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path

              return (
                <Link
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-teal-50 hover:text-teal-800'
                  }`}
                  key={item.path}
                  to={item.path}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="surface flex min-h-full flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-teal-100 px-4 py-4 md:px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Operations</p>
              <h2 className="text-xl font-semibold">Bluegreen Admin</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800 lg:hidden"
                onClick={() => setMenuOpen((prev) => !prev)}
                type="button"
              >
                Menu
              </button>
              <span className="chip">{user.first_name} {user.last_name} ({user.role})</span>
              <button
                className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
                disabled={loggingOut}
                onClick={handleLogout}
                type="button"
              >
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </header>

          <section className="flex-1 p-4 md:p-6">
            <Routes>
              <Route element={<DashboardPage />} path="/dashboard" />
              <Route element={<CalendarPage />} path="/calendar" />
              <Route element={<DriverSchedulesPage currentUser={user} />} path="/driver-schedules" />
              <Route element={<DriverWorkSchedulesPage currentUser={user} />} path="/driver-work-schedules" />
              <Route element={<TravelRequestsPage currentUser={user} />} path="/travel-requests" />
              <Route element={<UsersPage currentUser={user} />} path="/users" />
              <Route element={<DriversPage />} path="/drivers" />
              <Route element={<VehiclesPage />} path="/vehicles" />
              <Route element={<SimplePage title="Reports" />} path="/reports" />
              <Route element={<SimplePage title="Settings" />} path="/settings" />
              <Route element={<Navigate replace to="/dashboard" />} path="*" />
            </Routes>
          </section>
        </main>
      </div>
    </div>
  )
}

function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${apiBasePrefix}/api/dashboard/summary`)
        if (!response.ok) {
          setLoading(false)
          return
        }

        const data = (await response.json()) as DashboardSummary
        setSummary(data)
      } finally {
        setLoading(false)
      }
    }

    load().catch(() => setLoading(false))
  }, [])

  const cards = useMemo(
    () => [
      { label: 'Revenue', value: summary?.revenue ?? '$0.00' },
      { label: 'Orders', value: String(summary?.orders ?? 0) },
      { label: 'Users', value: String(summary?.users ?? 0) },
      { label: 'Conversion', value: summary?.conversionRate ?? '0%' },
    ],
    [summary],
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article className="rounded-2xl border border-teal-100 bg-gradient-to-b from-white to-teal-50 p-4" key={card.label}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Latest Orders</h3>
          <span className="text-xs text-slate-500">Live from PHP API</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && summary?.latestOrders?.length
                ? summary.latestOrders.map((order) => (
                    <tr className="border-t border-slate-100" key={order.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{order.id}</td>
                      <td className="px-4 py-3 text-slate-700">{order.customer}</td>
                      <td className="px-4 py-3 text-slate-700">{order.amount}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                : null}

              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    Loading dashboard data...
                  </td>
                </tr>
              ) : null}

              {!loading && !summary?.latestOrders?.length ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No order data available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

function CalendarPage() {
  const [entries, setEntries] = useState<CalendarTravelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${apiBasePrefix}/api/travel-requests/calendar`)

        if (!response.ok) {
          setError('Failed to load approved travel schedules.')
          setLoading(false)
          return
        }

        const payload = (await response.json()) as { data: CalendarTravelItem[] }
        setEntries(payload.data)
      } catch {
        setError('Unable to connect to calendar endpoint.')
      } finally {
        setLoading(false)
      }
    }

    loadCalendar().catch(() => setLoading(false))
  }, [])

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const firstWeekday = firstDayOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const gridSize = 42

  const monthLabel = monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const toDateKey = (value: Date) => {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const entryBuckets = useMemo(() => {
    const bucket = new Map<string, CalendarTravelItem[]>()

    for (const entry of entries) {
      const dateKey = entry.start_at.slice(0, 10)
      const list = bucket.get(dateKey) ?? []
      list.push(entry)
      bucket.set(dateKey, list)
    }

    return bucket
  }, [entries])

  const cells = Array.from({ length: gridSize }, (_, index) => {
    const dayNumber = index - firstWeekday + 1
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth
    const date = new Date(year, month, dayNumber)
    const dateKey = toDateKey(date)
    const dayEntries = inMonth ? entryBuckets.get(dateKey) ?? [] : []

    return {
      key: `${dateKey}-${index}`,
      inMonth,
      dayNumber,
      dayEntries,
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Approved Travel Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            type="button"
          >
            Prev
          </button>
          <span className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">{monthLabel}</span>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white p-3 md:p-4">
        {loading ? <p className="px-2 py-4 text-sm text-slate-500">Loading calendar...</p> : null}

        {!loading ? (
          <div className="grid grid-cols-7 gap-2">
            {weekdayLabels.map((label) => (
              <div className="rounded-lg bg-teal-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600" key={label}>
                {label}
              </div>
            ))}

            {cells.map((cell) => (
              <div
                className={`min-h-28 rounded-lg border p-2 ${cell.inMonth ? 'border-teal-100 bg-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                key={cell.key}
              >
                {cell.inMonth ? (
                  <>
                    <p className="mb-1 text-xs font-semibold text-slate-700">{cell.dayNumber}</p>
                    <div className="space-y-1">
                      {cell.dayEntries.slice(0, 3).map((entry) => (
                        <div className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800" key={entry.id}>
                          {entry.vehicle_code}: {entry.purpose}
                        </div>
                      ))}
                      {cell.dayEntries.length > 3 ? (
                        <p className="text-[11px] font-medium text-slate-500">+{cell.dayEntries.length - 3} more</p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  )
}

function DriverSchedulesPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<DriverScheduleItem[]>([])
  const [drivers, setDrivers] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  })

  const canManage = currentUser.role === 'admin' || currentUser.role === 'manager'

  const loadSchedule = async () => {
    setLoading(true)
    setError('')

    try {
      const [scheduleRes, driversRes] = await Promise.all([
        fetch(`${apiBasePrefix}/api/driver-schedules?start_date=${startDate}&end_date=${endDate}`),
        fetch(`${apiBasePrefix}/api/travel-requests/driver-options`),
      ])

      if (!scheduleRes.ok || !driversRes.ok) {
        const statusCode = !scheduleRes.ok ? scheduleRes.status : driversRes.status
        setError(
          statusCode === 403
            ? 'Only manager/admin can access driver schedule management.'
            : 'Failed to load driver schedules.',
        )
        setLoading(false)
        return
      }

      const schedulePayload = (await scheduleRes.json()) as { data: DriverScheduleItem[] }
      const driversPayload = (await driversRes.json()) as { data: VehicleOption[] }
      setItems(schedulePayload.data)
      setDrivers(driversPayload.data)
    } catch {
      setError('Unable to connect to driver schedule endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule().catch(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, DriverScheduleItem[]>()
    for (const item of items) {
      const key = item.driver_name ?? 'Unassigned'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [items])

  const reassign = async (id: number, driverId: number) => {
    const response = await fetch(`${apiBasePrefix}/api/driver-schedules/reassign?id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: driverId }),
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to reassign driver.')
      return
    }
    await loadSchedule()
  }

  const unassign = async (id: number) => {
    const response = await fetch(`${apiBasePrefix}/api/driver-schedules/unassign?id=${id}`, {
      method: 'POST',
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to unassign driver.')
      return
    }
    await loadSchedule()
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Driver Schedules</h3>
        <p className="mt-2 text-sm text-slate-600">Only manager/admin can manage driver schedules.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Start Date
            <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            End Date
            <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
          <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800" onClick={() => loadSchedule().catch(() => setError('Failed to refresh schedule.'))} type="button">
            Load Schedule
          </button>
        </div>
      </article>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        {loading ? <p className="text-sm text-slate-500">Loading driver schedules...</p> : null}
        {!loading && grouped.length === 0 ? <p className="text-sm text-slate-500">No scheduled trips in this range.</p> : null}

        {!loading
          ? grouped.map(([driverName, schedules]) => (
              <div className="mb-5" key={driverName}>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">{driverName}</h3>
                <div className="space-y-2">
                  {schedules.map((item) => (
                    <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3" key={item.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.reservation_no} - {item.vehicle_code} ({item.vehicle_name})
                        </p>
                        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{item.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{item.start_at} to {item.end_at}</p>
                      <p className="mt-1 text-sm text-slate-700">{item.purpose} | Requester: {item.requester_name}</p>
                      {item.status === 'approved' ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select className="rounded-lg border border-teal-200 px-2 py-1 text-xs text-teal-800" defaultValue="" onChange={(event) => { const value = Number(event.target.value); if (value > 0) reassign(item.id, value).catch(() => setError('Failed to reassign driver.')) }}>
                            <option value="">Reassign driver</option>
                            {drivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>{driver.name}</option>
                            ))}
                          </select>
                          {item.assigned_driver_id ? (
                            <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => unassign(item.id).catch(() => setError('Failed to unassign driver.'))} type="button">
                              Unassign
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))
          : null}
      </article>
    </div>
  )
}

function DriverWorkSchedulesPage({ currentUser }: { currentUser: AuthUser }) {
  const toLocalYmd = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [items, setItems] = useState<DriverWorkScheduleItem[]>([])
  const [drivers, setDrivers] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showWeeklyView, setShowWeeklyView] = useState(false)
  const [weeklyEditing, setWeeklyEditing] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [weeklyDraft, setWeeklyDraft] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return toLocalYmd(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    return toLocalYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  })
  const [form, setForm] = useState({
    driver_id: '',
    work_date: '',
    start_time: '08:00:00',
    end_time: '17:00:00',
    shift_type: 'regular',
    status: 'scheduled',
    notes: '',
  })

  const canManage = currentUser.role === 'admin' || currentUser.role === 'manager'

  const shiftCodeLabel = (code: DriverWorkScheduleItem['shift_code'] | 'UNSET' | null | undefined): string => {
    if (!code || code === 'UNSET') return '-'
    switch (code) {
      case 'S8_5':
        return '8-5'
      case 'S6_2':
        return '6-2'
      case 'S2_10':
        return '2-10'
      case 'S10_6':
        return '10-6'
      case 'OFF':
        return 'OFF'
      case 'H_OFF':
        return 'H-OFF'
      case 'CO':
        return 'CO'
      case 'LEAVE':
        return 'LEAVE'
      default:
        return '-'
    }
  }

  const scheduleCellCode = (item: DriverWorkScheduleItem): 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'UNSET' => {
    if (item.shift_code) {
      return item.shift_code
    }

    if (item.shift_type === 'off') return 'OFF'
    if (item.shift_type === 'leave') return 'LEAVE'
    if (!item.start_time || !item.end_time) return 'UNSET'
    if (item.start_time === '06:00:00' && item.end_time === '14:00:00') return 'S6_2'
    if (item.start_time === '08:00:00' && item.end_time === '17:00:00') return 'S8_5'
    if (item.start_time === '14:00:00' && item.end_time === '22:00:00') return 'S2_10'
    if (item.start_time === '22:00:00' && item.end_time === '06:00:00') return 'S10_6'
    return 'UNSET'
  }

  const weeklyContext = useMemo(() => {
    const parseLocalDate = (value: string): Date => {
      const parts = value.split('-').map(Number)
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    const toYmd = (date: Date): string => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    const baseDate = parseLocalDate(startDate)
    const daysBackToSunday = baseDate.getDay()
    const sunday = new Date(baseDate)
    sunday.setDate(baseDate.getDate() - daysBackToSunday)

    const weekDates: string[] = []
    for (let index = 0; index < 7; index++) {
      const day = new Date(sunday)
      day.setDate(sunday.getDate() + index)
      weekDates.push(toYmd(day))
    }

    const weekDateSet = new Set(weekDates)
    const assignmentByDriver = new Map<number, 'administrative' | 'ambulance'>(
      drivers.map((driver) => [driver.id, driver.assignment_type ?? 'ambulance']),
    )
    const rowsByDriver = new Map<number, {
      id: number
      name: string
      assignment: 'administrative' | 'ambulance'
      codes: Array<'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'UNSET'>
    }>()

    items.forEach((item) => {
      if (!weekDateSet.has(item.work_date)) {
        return
      }

      if (!rowsByDriver.has(item.driver_id)) {
        rowsByDriver.set(item.driver_id, {
          id: item.driver_id,
          name: item.driver_name,
          assignment: assignmentByDriver.get(item.driver_id) ?? 'ambulance',
          codes: Array(7).fill('UNSET') as Array<'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'UNSET'>,
        })
      }

      const dayIndex = weekDates.indexOf(item.work_date)
      if (dayIndex >= 0) {
        const row = rowsByDriver.get(item.driver_id)
        if (row) {
          row.codes[dayIndex] = scheduleCellCode(item)
        }
      }
    })

    const rows = Array.from(rowsByDriver.values()).sort((left, right) => left.name.localeCompare(right.name))

    return {
      weekDates,
      ambulanceRows: rows.filter((row) => row.assignment === 'ambulance'),
      administrativeRows: rows.filter((row) => row.assignment === 'administrative'),
    }
  }, [drivers, items, startDate])

  const loadData = async (rangeStartDate: string = startDate, rangeEndDate: string = endDate) => {
    setLoading(true)
    setError('')

    try {
      const [itemsRes, driversRes] = await Promise.all([
        fetch(`${apiBasePrefix}/api/driver-work-schedules?start_date=${rangeStartDate}&end_date=${rangeEndDate}`),
        fetch(`${apiBasePrefix}/api/travel-requests/driver-options`),
      ])

      if (!itemsRes.ok || !driversRes.ok) {
        const statusCode = !itemsRes.ok ? itemsRes.status : driversRes.status
        setError(statusCode === 403 ? 'Only manager/admin can manage driver work schedules.' : 'Failed to load work schedules.')
        setLoading(false)
        return
      }

      const itemsPayload = (await itemsRes.json()) as { data: DriverWorkScheduleItem[] }
      const driversPayload = (await driversRes.json()) as { data: VehicleOption[] }
      setItems(itemsPayload.data)
      setDrivers(driversPayload.data)
    } catch {
      setError('Unable to connect to driver work schedule endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      driver_id: '',
      work_date: '',
      start_time: '08:00:00',
      end_time: '17:00:00',
      shift_type: 'regular',
      status: 'scheduled',
      notes: '',
    })
  }

  const generateSchedules = async () => {
    setGenerating(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/generate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to auto-generate schedules.')
        setGenerating(false)
        return
      }

      const body = (await response.json()) as { range?: { start_date: string; end_date: string } }
      const generatedStartDate = body.range?.start_date ?? startDate
      const generatedEndDate = body.range?.end_date ?? endDate
      setStartDate(generatedStartDate)
      setEndDate(generatedEndDate)
      await loadData(generatedStartDate, generatedEndDate)
    } catch {
      setError('Unable to auto-generate schedules.')
    } finally {
      setGenerating(false)
    }
  }

  const shiftWeeklyView = async (direction: 'previous' | 'next') => {
    const parts = startDate.split('-').map(Number)
    const baseStart = new Date(parts[0], parts[1] - 1, parts[2])
    const movedStart = new Date(baseStart)
    movedStart.setDate(baseStart.getDate() + (direction === 'next' ? 7 : -7))
    const movedEnd = new Date(movedStart)
    movedEnd.setDate(movedStart.getDate() + 6)

    const nextStartDate = toLocalYmd(movedStart)
    const nextEndDate = toLocalYmd(movedEnd)
    setStartDate(nextStartDate)
    setEndDate(nextEndDate)
    await loadData(nextStartDate, nextEndDate)
  }

  const beginWeeklyEdit = () => {
    setWeeklyDraft({})
    setWeeklyEditing(true)
  }

  const cancelWeeklyEdit = () => {
    setWeeklyDraft({})
    setWeeklyEditing(false)
  }

  const changeWeeklyCell = (driverId: number, workDate: string, shiftCode: string) => {
    const key = `${driverId}|${workDate}`
    setWeeklyDraft((prev) => ({ ...prev, [key]: shiftCode }))
  }

  const saveWeeklyGrid = async () => {
    setSavingWeekly(true)
    setError('')

    const rows = [...weeklyContext.ambulanceRows, ...weeklyContext.administrativeRows]
    const cells = rows.flatMap((row) =>
      weeklyContext.weekDates.map((workDate, index) => {
        const key = `${row.id}|${workDate}`
        const shiftCode = (weeklyDraft[key] ?? row.codes[index]) as string
        return {
          driver_id: row.id,
          work_date: workDate,
          shift_code: shiftCode,
        }
      }),
    )

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/upsert-weekly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_start: weeklyContext.weekDates[0],
          cells,
        }),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save weekly schedule changes.')
        setSavingWeekly(false)
        return
      }

      setWeeklyDraft({})
      setWeeklyEditing(false)
      await loadData(startDate, endDate)
    } catch {
      setError('Unable to save weekly schedule changes.')
    } finally {
      setSavingWeekly(false)
    }
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      driver_id: Number(form.driver_id),
      work_date: form.work_date,
      start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
      end_time: form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time,
      shift_type: form.shift_type,
      status: form.status,
      notes: form.notes.trim(),
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/driver-work-schedules/item?id=${editingId}`
      : `${apiBasePrefix}/api/driver-work-schedules`

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save work schedule.')
        setSaving(false)
        return
      }

      await loadData()
      resetForm()
    } catch {
      setError('Unable to save work schedule.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load work schedule.')
        return
      }

      const payload = (await response.json()) as { data: DriverWorkScheduleItem }
      const item = payload.data
      setEditingId(item.id)
      setForm({
        driver_id: String(item.driver_id),
        work_date: item.work_date,
        start_time: item.start_time ?? '08:00:00',
        end_time: item.end_time ?? '17:00:00',
        shift_type: item.shift_type,
        status: item.status,
        notes: item.notes ?? '',
      })
    } catch {
      setError('Unable to load work schedule.')
    }
  }

  const deleteItem = async (id: number) => {
    const confirmed = window.confirm('Delete this work schedule?')
    if (!confirmed) return

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/item?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete work schedule.')
        return
      }

      await loadData()
      if (editingId === id) resetForm()
    } catch {
      setError('Unable to delete work schedule.')
    }
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Driver Work Schedules</h3>
        <p className="mt-2 text-sm text-slate-600">Only manager/admin can manage driver work schedules.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? `Edit Work Schedule #${editingId}` : 'Create Driver Work Schedule'}
          </h3>
          {editingId ? (
            <button className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800" onClick={resetForm} type="button">
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={submitForm}>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, driver_id: event.target.value }))} required value={form.driver_id}>
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, work_date: event.target.value }))} required type="date" value={form.work_date} />
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, shift_type: event.target.value as 'regular' | 'overtime' | 'off' | 'leave' }))} value={form.shift_type}>
            <option value="regular">regular</option>
            <option value="overtime">overtime</option>
            <option value="off">off</option>
            <option value="leave">leave</option>
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))} required type="time" value={form.start_time.slice(0, 5)} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))} required type="time" value={form.end_time.slice(0, 5)} />
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'scheduled' | 'completed' | 'cancelled' }))} value={form.status}>
            <option value="scheduled">scheduled</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-3" onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes (optional)" value={form.notes} />
          <div className="md:col-span-3">
            <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Update Work Schedule' : 'Create Work Schedule'}
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Start Date
            <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            End Date
            <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
          <button className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800" onClick={() => loadData().catch(() => setError('Failed to load schedules.'))} type="button">
            Load Schedules
          </button>
          <button className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={generating} onClick={() => generateSchedules().catch(() => setError('Failed to auto-generate schedules.'))} type="button">
            {generating ? 'Generating...' : 'Auto Generate Next Week'}
          </button>
          <button className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50" onClick={() => setShowWeeklyView((prev) => !prev)} type="button">
            {showWeeklyView ? 'Hide Weekly View' : 'Weekly View'}
          </button>
        </div>

        {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-500">Loading work schedules...</p> : null}

        {!loading && showWeeklyView ? (
          <div className="mb-4 overflow-x-auto rounded-xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Weekly Schedule {weeklyContext.weekDates[0]} to {weeklyContext.weekDates[6]}
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  onClick={() => shiftWeeklyView('previous').catch(() => setError('Failed to load previous week.'))}
                  disabled={weeklyEditing || savingWeekly}
                  type="button"
                >
                  Previous Week
                </button>
                <button
                  className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  onClick={() => shiftWeeklyView('next').catch(() => setError('Failed to load next week.'))}
                  disabled={weeklyEditing || savingWeekly}
                  type="button"
                >
                  Next Week
                </button>
                {!weeklyEditing ? (
                  <button
                    className="rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                    onClick={beginWeeklyEdit}
                    type="button"
                  >
                    Edit Weekly Grid
                  </button>
                ) : null}
                {weeklyEditing ? (
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={cancelWeeklyEdit}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
                {weeklyEditing ? (
                  <button
                    className="rounded-lg border border-teal-700 bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={savingWeekly}
                    onClick={() => saveWeeklyGrid().catch(() => setError('Failed to save weekly grid.'))}
                    type="button"
                  >
                    {savingWeekly ? 'Saving...' : 'Save Weekly Grid'}
                  </button>
                ) : null}
              </div>
            </div>
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="border border-amber-200 px-3 py-2">Driver</th>
                  <th className="border border-amber-200 px-3 py-2">Sun {weeklyContext.weekDates[0]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Mon {weeklyContext.weekDates[1]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Tue {weeklyContext.weekDates[2]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Wed {weeklyContext.weekDates[3]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Thu {weeklyContext.weekDates[4]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Fri {weeklyContext.weekDates[5]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Sat {weeklyContext.weekDates[6]?.slice(8, 10)}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-yellow-100">
                  <td className="border border-amber-200 px-3 py-2 font-semibold text-slate-900" colSpan={8}>Ambulance Drivers</td>
                </tr>
                {weeklyContext.ambulanceRows.map((row) => (
                  <tr key={`amb-${row.id}`}>
                    <td className="border border-amber-200 px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    {row.codes.map((code, index) => {
                      const workDate = weeklyContext.weekDates[index]
                      const key = `${row.id}|${workDate}`
                      const value = (weeklyDraft[key] ?? code) as 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'UNSET'
                      const cell = shiftCodeLabel(value)
                      const offLike = cell.includes('OFF') || cell === 'CO' || cell === 'LEAVE'
                      return (
                        <td className={`border border-amber-200 px-3 py-2 text-center font-semibold ${offLike ? 'bg-lime-100 text-slate-800' : 'text-slate-900'}`} key={`amb-${row.id}-${workDate}`}>
                          {weeklyEditing ? (
                            <select
                              className="w-full rounded border border-amber-300 bg-white px-1 py-1 text-xs"
                              onChange={(event) => changeWeeklyCell(row.id, workDate, event.target.value)}
                              value={value}
                            >
                              <option value="UNSET">-</option>
                              <option value="S8_5">8-5</option>
                              <option value="S6_2">6-2</option>
                              <option value="S2_10">2-10</option>
                              <option value="S10_6">10-6</option>
                              <option value="OFF">OFF</option>
                              <option value="H_OFF">H-OFF</option>
                              <option value="CO">CO</option>
                              <option value="LEAVE">LEAVE</option>
                            </select>
                          ) : (
                            cell
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="bg-yellow-100">
                  <td className="border border-amber-200 px-3 py-2 font-semibold text-slate-900" colSpan={8}>Administrative Drivers</td>
                </tr>
                {weeklyContext.administrativeRows.map((row) => (
                  <tr key={`adm-${row.id}`}>
                    <td className="border border-amber-200 px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    {row.codes.map((code, index) => {
                      const workDate = weeklyContext.weekDates[index]
                      const key = `${row.id}|${workDate}`
                      const value = (weeklyDraft[key] ?? code) as 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'UNSET'
                      const cell = shiftCodeLabel(value)
                      const offLike = cell.includes('OFF') || cell === 'CO' || cell === 'LEAVE'
                      return (
                        <td className={`border border-amber-200 px-3 py-2 text-center font-semibold ${offLike ? 'bg-lime-100 text-slate-800' : 'text-slate-900'}`} key={`adm-${row.id}-${workDate}`}>
                          {weeklyEditing ? (
                            <select
                              className="w-full rounded border border-amber-300 bg-white px-1 py-1 text-xs"
                              onChange={(event) => changeWeeklyCell(row.id, workDate, event.target.value)}
                              value={value}
                            >
                              <option value="UNSET">-</option>
                              <option value="S8_5">8-5</option>
                              <option value="S6_2">6-2</option>
                              <option value="S2_10">2-10</option>
                              <option value="S10_6">10-6</option>
                              <option value="OFF">OFF</option>
                              <option value="H_OFF">H-OFF</option>
                              <option value="CO">CO</option>
                              <option value="LEAVE">LEAVE</option>
                            </select>
                          ) : (
                            cell
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No work schedules in this range.</td></tr>
                ) : null}
                {items.map((item) => (
                  <tr className="border-t border-slate-100" key={item.id}>
                    <td className="px-4 py-3 text-slate-700">{item.work_date}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.driver_name}</td>
                    <td className="px-4 py-3 text-slate-700">{item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{item.shift_code ? shiftCodeLabel(item.shift_code) : item.shift_type}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{item.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(item.id).catch(() => setError('Failed to load schedule.'))} type="button">Edit</button>
                        <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteItem(item.id).catch(() => setError('Failed to delete schedule.'))} type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </div>
  )
}

function TravelRequestsPage({ currentUser }: { currentUser: AuthUser }) {
  const [requests, setRequests] = useState<TravelRequestItem[]>([])
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [locations, setLocations] = useState<VehicleOption[]>([])
  const [drivers, setDrivers] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [assignDriverId, setAssignDriverId] = useState('')
  const [statusTab, setStatusTab] = useState<'all' | TravelRequestItem['status']>('all')
  const [showRequesterForm, setShowRequesterForm] = useState(false)
  const [form, setForm] = useState({
    vehicle_id: '',
    pickup_location_id: '',
    dropoff_location_id: '',
    purpose: '',
    destination: '',
    start_at: '',
    end_at: '',
    passengers: '',
    priority: 'normal',
    remarks: '',
  })

  const isRequester = currentUser.role === 'requester'
  const canManageApprovals = currentUser.role === 'manager' || currentUser.role === 'admin'
  const selectedRequest = selectedRequestId !== null
    ? requests.find((item) => item.id === selectedRequestId) ?? null
    : null
  const statusTabs: Array<{ key: 'all' | TravelRequestItem['status']; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'no_show', label: 'No Show' },
  ]
  const filteredRequests = statusTab === 'all'
    ? requests
    : requests.filter((item) => item.status === statusTab)
  const requestStatusBadgeClass = (status: TravelRequestItem['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-slate-200 text-slate-700'
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'active':
        return 'bg-sky-100 text-sky-800'
      case 'completed':
        return 'bg-teal-100 text-teal-800'
      case 'no_show':
        return 'bg-rose-100 text-rose-800'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const toSqlDateTime = (value: string): string => value.replace('T', ' ') + ':00'
  const fromSqlDateTime = (value: string): string => value.slice(0, 16).replace(' ', 'T')

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const requestsPromise = fetch(`${apiBasePrefix}/api/travel-requests`)
      const vehiclesPromise = fetch(`${apiBasePrefix}/api/vehicles`)
      const locationsPromise = fetch(`${apiBasePrefix}/api/locations`)
      const driversPromise = canManageApprovals
        ? fetch(`${apiBasePrefix}/api/travel-requests/driver-options`)
        : Promise.resolve(null)

      const [requestsRes, vehiclesRes, locationsRes, driversRes] = await Promise.all([
        requestsPromise,
        vehiclesPromise,
        locationsPromise,
        driversPromise,
      ])

      if (!requestsRes.ok || !vehiclesRes.ok || !locationsRes.ok) {
        setError('Failed to load travel request data.')
        setLoading(false)
        return
      }

      const requestsPayload = (await requestsRes.json()) as { data: TravelRequestItem[] }
      const vehiclesPayload = (await vehiclesRes.json()) as { data: ManagedVehicle[] }
      const locationsPayload = (await locationsRes.json()) as { data: VehicleOption[] }

      setRequests(requestsPayload.data)
      setVehicles(vehiclesPayload.data)
      setLocations(locationsPayload.data)

      if (driversRes && driversRes.ok) {
        const driversPayload = (await driversRes.json()) as { data: VehicleOption[] }
        setDrivers(driversPayload.data)
      }
    } catch {
      setError('Unable to connect to travel request endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setShowRequesterForm(false)
    setForm({
      vehicle_id: '',
      pickup_location_id: '',
      dropoff_location_id: '',
      purpose: '',
      destination: '',
      start_at: '',
      end_at: '',
      passengers: '',
      priority: 'normal',
      remarks: '',
    })
  }

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      vehicle_id: Number(form.vehicle_id),
      pickup_location_id: form.pickup_location_id ? Number(form.pickup_location_id) : null,
      dropoff_location_id: form.dropoff_location_id ? Number(form.dropoff_location_id) : null,
      purpose: form.purpose.trim(),
      destination: form.destination.trim(),
      start_at: toSqlDateTime(form.start_at),
      end_at: toSqlDateTime(form.end_at),
      passengers: form.passengers ? Number(form.passengers) : null,
      priority: form.priority,
      remarks: form.remarks.trim(),
    }

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId
      ? `${apiBasePrefix}/api/travel-requests/item?id=${editingId}`
      : `${apiBasePrefix}/api/travel-requests`

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save request.')
        setSaving(false)
        return
      }

      await loadData()
      resetForm()
    } catch {
      setError('Unable to save request.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: TravelRequestItem) => {
    setEditingId(item.id)
    setShowRequesterForm(true)
    setForm({
      vehicle_id: String(item.vehicle_id),
      pickup_location_id: item.pickup_location_id ? String(item.pickup_location_id) : '',
      dropoff_location_id: item.dropoff_location_id ? String(item.dropoff_location_id) : '',
      purpose: item.purpose,
      destination: item.destination ?? '',
      start_at: fromSqlDateTime(item.start_at),
      end_at: fromSqlDateTime(item.end_at),
      passengers: item.passengers ? String(item.passengers) : '',
      priority: item.priority,
      remarks: item.remarks ?? '',
    })
  }

  const cancelRequest = async (id: number) => {
    const confirmed = window.confirm('Cancel this pending travel request?')
    if (!confirmed) return

    const response = await fetch(`${apiBasePrefix}/api/travel-requests/cancel?id=${id}`, { method: 'POST' })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to cancel request.')
      return
    }
    await loadData()
  }

  const openRequestView = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/travel-requests/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load request details.')
        return
      }

      setSelectedRequestId(id)
      setRejectReason('')
      setAssignDriverId('')
    } catch {
      setError('Unable to load request details.')
    }
  }

  const approveRequest = async (id: number) => {
    const response = await fetch(`${apiBasePrefix}/api/travel-requests/approve?id=${id}`, { method: 'POST' })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to approve request.')
      return
    }
    await loadData()
  }

  const submitReject = async (id: number) => {
    const response = await fetch(`${apiBasePrefix}/api/travel-requests/reject?id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason.trim() }),
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to reject request.')
      return
    }
    setRejectReason('')
    await loadData()
  }

  const assignDriver = async (requestId: number, driverId: number) => {
    const response = await fetch(`${apiBasePrefix}/api/travel-requests/assign-driver?id=${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: driverId }),
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to assign driver.')
      return
    }
    setAssignDriverId('')
    await loadData()
  }

  const managerCancelApproved = async (requestId: number) => {
    const reasonInput = window.prompt('Reason for cancellation (optional):', 'Cancelled by manager/admin')
    if (reasonInput === null) {
      return
    }

    const response = await fetch(`${apiBasePrefix}/api/travel-requests/manager-cancel?id=${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reasonInput.trim() }),
    })

    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to cancel approved request.')
      return
    }

    await loadData()
  }

  return (
    <div className="space-y-5">
      {isRequester ? (
        <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Travel Request Form</h3>
            {!showRequesterForm ? (
              <button className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800" onClick={() => { setShowRequesterForm(true); setEditingId(null) }} type="button">
                Request New Travel
              </button>
            ) : (
              <button className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800" onClick={resetForm} type="button">
                {editingId ? 'Cancel Edit' : 'Close Form'}
              </button>
            )}
          </div>

          {showRequesterForm ? (
            <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitRequest}>
              <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, vehicle_id: event.target.value }))} required value={form.vehicle_id}>
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_code} - {vehicle.make} {vehicle.model}</option>
                ))}
              </select>
              <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))} value={form.priority}>
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
              <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))} placeholder="Purpose" required value={form.purpose} />
              <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))} placeholder="Destination" value={form.destination} />
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Start
                <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))} required type="datetime-local" value={form.start_at} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                End
                <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))} required type="datetime-local" value={form.end_at} />
              </label>
              <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, pickup_location_id: event.target.value }))} value={form.pickup_location_id}>
                <option value="">Pickup location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, dropoff_location_id: event.target.value }))} value={form.dropoff_location_id}>
                <option value="">Dropoff location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, passengers: event.target.value }))} placeholder="Passengers" value={form.passengers} />
              <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Remarks" value={form.remarks} />
              <div className="md:col-span-2">
                <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
                  {saving ? 'Saving...' : editingId ? 'Update Request' : 'Submit Request'}
                </button>
              </div>
            </form>
          ) : null}
        </article>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {selectedRequest ? (
        <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Request View: {selectedRequest.reservation_no}
            </h3>
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
              onClick={() => { setSelectedRequestId(null); setRejectReason(''); setAssignDriverId('') }}
              type="button"
            >
              Close View
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p><span className="font-semibold text-slate-700">Requester:</span> {selectedRequest.requester_name}</p>
            <p><span className="font-semibold text-slate-700">Vehicle:</span> {selectedRequest.vehicle_code} ({selectedRequest.vehicle_name})</p>
            <p><span className="font-semibold text-slate-700">Travel Date:</span> {selectedRequest.start_at} to {selectedRequest.end_at}</p>
            <p><span className="font-semibold text-slate-700">Status:</span> {selectedRequest.status}</p>
            <p><span className="font-semibold text-slate-700">Purpose:</span> {selectedRequest.purpose}</p>
            <p><span className="font-semibold text-slate-700">Destination:</span> {selectedRequest.destination ?? '-'}</p>
            <p><span className="font-semibold text-slate-700">Pickup:</span> {selectedRequest.pickup_location_name ?? '-'}</p>
            <p><span className="font-semibold text-slate-700">Dropoff:</span> {selectedRequest.dropoff_location_name ?? '-'}</p>
            <p><span className="font-semibold text-slate-700">Passengers:</span> {selectedRequest.passengers ?? '-'}</p>
            <p><span className="font-semibold text-slate-700">Priority:</span> {selectedRequest.priority}</p>
            <p><span className="font-semibold text-slate-700">Assigned Driver:</span> {selectedRequest.driver_name ?? '-'}</p>
            <p><span className="font-semibold text-slate-700">Remarks:</span> {selectedRequest.remarks ?? '-'}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {isRequester && selectedRequest.status === 'pending' ? (
              <>
                <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(selectedRequest)} type="button">Edit Request</button>
                <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => cancelRequest(selectedRequest.id).catch(() => setError('Failed to cancel request.'))} type="button">Cancel Request</button>
              </>
            ) : null}
            {canManageApprovals && selectedRequest.status === 'pending' ? (
              <>
                <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => approveRequest(selectedRequest.id).catch(() => setError('Failed to approve request.'))} type="button">Approve</button>
                <input className="rounded-lg border border-red-200 px-2 py-1 text-xs" onChange={(event) => setRejectReason(event.target.value)} placeholder="Reject reason" value={rejectReason} />
                <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => submitReject(selectedRequest.id).catch(() => setError('Failed to reject request.'))} type="button">Reject</button>
              </>
            ) : null}
            {canManageApprovals && selectedRequest.status === 'approved' ? (
              <>
                <select className="rounded-lg border border-teal-200 px-2 py-1 text-xs text-teal-800" onChange={(event) => setAssignDriverId(event.target.value)} value={assignDriverId}>
                  <option value="">Assign driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
                </select>
                <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={assignDriverId === ''} onClick={() => assignDriver(selectedRequest.id, Number(assignDriverId)).catch(() => setError('Failed to assign driver.'))} type="button">Save Driver</button>
                <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => managerCancelApproved(selectedRequest.id).catch(() => setError('Failed to cancel approved request.'))} type="button">Cancel Approved</button>
              </>
            ) : null}
          </div>
        </article>
      ) : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Travel Requests</h3>
          <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadData()} type="button">
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-teal-100 px-4 py-3">
          {statusTabs.map((tab) => {
            const count = tab.key === 'all'
              ? requests.length
              : requests.filter((item) => item.status === tab.key).length
            const active = statusTab === tab.key

            return (
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
                }`}
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                type="button"
              >
                {tab.label} ({count})
              </button>
            )
          })}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading requests...</td></tr> : null}
              {!loading && filteredRequests.length === 0 ? <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No travel requests found for this status.</td></tr> : null}
              {!loading ? filteredRequests.map((item) => (
                <tr className="border-t border-slate-100" key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.reservation_no}</td>
                  <td className="px-4 py-3 text-slate-700">{item.requester_name}</td>
                  <td className="px-4 py-3 text-slate-700">{item.vehicle_code} ({item.vehicle_name})</td>
                  <td className="px-4 py-3 text-slate-700">{item.start_at} to {item.end_at}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${requestStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.driver_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => openRequestView(item.id).catch(() => setError('Failed to load request view.'))} type="button">View</button>
                      {isRequester && item.status === 'pending' ? (
                        <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(item)} type="button">Edit</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

function UsersPage({ currentUser }: { currentUser: AuthUser }) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    role_id: '',
    employee_no: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
    password: '',
  })

  const loadUsersData = async () => {
    setLoading(true)
    setError('')

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch(`${apiBasePrefix}/api/users`),
        fetch(`${apiBasePrefix}/api/roles`),
      ])

      if (!usersResponse.ok || !rolesResponse.ok) {
        const statusCode = !usersResponse.ok ? usersResponse.status : rolesResponse.status
        setError(
          statusCode === 403
            ? 'Only admin users can access user management.'
            : 'Failed to load users and roles.',
        )
        setLoading(false)
        return
      }

      const usersPayload = (await usersResponse.json()) as { data: ManagedUser[] }
      const rolesPayload = (await rolesResponse.json()) as { data: RoleOption[] }

      setUsers(usersPayload.data)
      setRoles(rolesPayload.data)
    } catch {
      setError('Unable to connect to user management endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsersData().catch(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      role_id: '',
      employee_no: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'active',
      password: '',
    })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      role_id: Number(form.role_id),
      employee_no: form.employee_no.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      password: form.password,
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/users/item?id=${editingId}`
      : `${apiBasePrefix}/api/users`

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save user.')
        setSaving(false)
        return
      }

      await loadUsersData()
      resetForm()
    } catch {
      setError('Unable to save user.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/users/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load user.')
        return
      }

      const payload = (await response.json()) as { data: ManagedUser }
      const user = payload.data
      setEditingId(user.id)
      setForm({
        role_id: String(user.role_id),
        employee_no: user.employee_no ?? '',
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone ?? '',
        status: user.status,
        password: '',
      })
    } catch {
      setError('Unable to load user.')
    }
  }

  const deleteUser = async (id: number) => {
    const confirmed = window.confirm('Delete this user account?')

    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/users/item?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete user.')
        return
      }

      await loadUsersData()
      if (editingId === id) {
        resetForm()
      }
    } catch {
      setError('Unable to delete user.')
    }
  }

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? `Edit User #${editingId}` : 'Create User'}
          </h3>
          {editingId ? (
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
              onClick={resetForm}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitForm}>
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            placeholder="First name"
            required
            value={form.first_name}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            placeholder="Last name"
            required
            value={form.last_name}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            required
            type="email"
            value={form.email}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            minLength={editingId ? 0 : 8}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder={editingId ? 'New password (optional)' : 'Password (min 8 chars)'}
            required={!editingId}
            type="password"
            value={form.password}
          />
          <select
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, role_id: event.target.value }))}
            required
            value={form.role_id}
          >
            <option value="">Select role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' | 'suspended' }))}
            value={form.status}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </select>
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, employee_no: event.target.value }))}
            placeholder="Employee no (optional)"
            value={form.employee_no}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone (optional)"
            value={form.phone}
          />
          <div className="md:col-span-2">
            <button
              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </article>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">User Accounts</h3>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
            onClick={() => loadUsersData()}
            type="button"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    Loading users...
                  </td>
                </tr>
              ) : null}

              {!loading && users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? users.map((managedUser) => (
                    <tr className="border-t border-slate-100" key={managedUser.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {managedUser.first_name} {managedUser.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{managedUser.email}</td>
                      <td className="px-4 py-3 text-slate-700">{managedUser.role_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">
                          {managedUser.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                            onClick={() => startEdit(managedUser.id)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={managedUser.id === currentUser.id}
                            onClick={() => deleteUser(managedUser.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

function DriversPage() {
  const [drivers, setDrivers] = useState<ManagedDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    employee_no: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
    dl_id_number: '',
    license_expiry: '',
    assignment_type: 'ambulance' as 'administrative' | 'ambulance',
    password: '',
  })

  const loadDrivers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/drivers`)

      if (!response.ok) {
        const code = response.status
        setError(code === 403 ? 'Only admin users can access driver management.' : 'Failed to load drivers.')
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { data: ManagedDriver[] }
      setDrivers(payload.data)
    } catch {
      setError('Unable to connect to driver endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDrivers().catch(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      employee_no: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'active',
      dl_id_number: '',
      license_expiry: '',
      assignment_type: 'ambulance',
      password: '',
    })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      employee_no: form.employee_no.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      dl_id_number: form.dl_id_number.trim(),
      license_expiry: form.license_expiry,
      assignment_type: form.assignment_type,
      password: form.password,
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/drivers/item?id=${editingId}`
      : `${apiBasePrefix}/api/drivers`

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save driver.')
        setSaving(false)
        return
      }

      await loadDrivers()
      resetForm()
    } catch {
      setError('Unable to save driver.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/drivers/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load driver.')
        return
      }

      const payload = (await response.json()) as { data: ManagedDriver }
      const driver = payload.data
      setEditingId(driver.id)
      setForm({
        employee_no: driver.employee_no ?? '',
        first_name: driver.first_name,
        last_name: driver.last_name,
        email: driver.email,
        phone: driver.phone ?? '',
        status: driver.status,
        dl_id_number: driver.dl_id_number ?? '',
        license_expiry: driver.license_expiry ?? '',
        assignment_type: driver.assignment_type ?? 'ambulance',
        password: '',
      })
    } catch {
      setError('Unable to load driver.')
    }
  }

  const deleteDriver = async (id: number) => {
    const confirmed = window.confirm('Delete this driver account?')

    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/drivers/item?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete driver.')
        return
      }

      await loadDrivers()
      if (editingId === id) {
        resetForm()
      }
    } catch {
      setError('Unable to delete driver.')
    }
  }

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? `Edit Driver #${editingId}` : 'Create Driver'}
          </h3>
          {editingId ? (
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
              onClick={resetForm}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitForm}>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))} placeholder="First name" required value={form.first_name} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))} placeholder="Last name" required value={form.last_name} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" required type="email" value={form.email} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" minLength={editingId ? 0 : 8} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder={editingId ? 'New password (optional)' : 'Password (min 8 chars)'} required={!editingId} type="password" value={form.password} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, employee_no: event.target.value }))} placeholder="Employee no (optional)" value={form.employee_no} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone (optional)" value={form.phone} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, dl_id_number: event.target.value }))} placeholder="DL ID Number" required value={form.dl_id_number} />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            License Expiry
            <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, license_expiry: event.target.value }))} required type="date" value={form.license_expiry} />
          </label>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, assignment_type: event.target.value as 'administrative' | 'ambulance' }))} value={form.assignment_type}>
            <option value="ambulance">ambulance</option>
            <option value="administrative">administrative</option>
          </select>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' | 'suspended' }))} value={form.status}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </select>
          <div className="md:col-span-2">
            <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Update Driver' : 'Create Driver'}
            </button>
          </div>
        </form>
      </article>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Driver Accounts</h3>
          <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadDrivers()} type="button">
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">DL ID</th>
                <th className="px-4 py-3">License Expiry</th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading drivers...</td></tr>
              ) : null}
              {!loading && drivers.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No drivers found.</td></tr>
              ) : null}
              {!loading
                ? drivers.map((driver) => (
                    <tr className="border-t border-slate-100" key={driver.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{driver.first_name} {driver.last_name}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.email}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.dl_id_number ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.license_expiry ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.assignment_type ?? '-'}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{driver.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(driver.id)} type="button">Edit</button>
                          <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteDriver(driver.id)} type="button">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

function VehiclesPage() {
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<VehicleOption[]>([])
  const [locations, setLocations] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    vehicle_code: '',
    plate_no: '',
    vin: '',
    type_id: '',
    service_type: 'administrative',
    current_location_id: '',
    make: '',
    model: '',
    year: '',
    color: '',
    transmission: '',
    fuel_type: '',
    seats: '',
    payload_kg: '',
    odometer_km: '0',
    status: 'available',
    registration_expiry: '',
    insurance_expiry: '',
    notes: '',
  })

  const loadVehicleData = async () => {
    setLoading(true)
    setError('')

    try {
      const [vehiclesResponse, typesResponse, locationsResponse] = await Promise.all([
        fetch(`${apiBasePrefix}/api/vehicles`),
        fetch(`${apiBasePrefix}/api/vehicle-types`),
        fetch(`${apiBasePrefix}/api/locations`),
      ])

      if (!vehiclesResponse.ok || !typesResponse.ok || !locationsResponse.ok) {
        const statusCode = !vehiclesResponse.ok
          ? vehiclesResponse.status
          : !typesResponse.ok
            ? typesResponse.status
            : locationsResponse.status

        setError(
          statusCode === 403
            ? 'Only admin users can access vehicle management.'
            : 'Failed to load vehicle data.',
        )
        setLoading(false)
        return
      }

      const vehiclesPayload = (await vehiclesResponse.json()) as { data: ManagedVehicle[] }
      const typesPayload = (await typesResponse.json()) as { data: VehicleOption[] }
      const locationsPayload = (await locationsResponse.json()) as { data: VehicleOption[] }

      setVehicles(vehiclesPayload.data)
      setVehicleTypes(typesPayload.data)
      setLocations(locationsPayload.data)
    } catch {
      setError('Unable to connect to vehicle management endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVehicleData().catch(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      vehicle_code: '',
      plate_no: '',
      vin: '',
      type_id: '',
      service_type: 'administrative',
      current_location_id: '',
      make: '',
      model: '',
      year: '',
      color: '',
      transmission: '',
      fuel_type: '',
      seats: '',
      payload_kg: '',
      odometer_km: '0',
      status: 'available',
      registration_expiry: '',
      insurance_expiry: '',
      notes: '',
    })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      type_id: Number(form.type_id),
      current_location_id: form.current_location_id === '' ? null : Number(form.current_location_id),
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/vehicles/item?id=${editingId}`
      : `${apiBasePrefix}/api/vehicles`

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save vehicle.')
        setSaving(false)
        return
      }

      await loadVehicleData()
      resetForm()
    } catch {
      setError('Unable to save vehicle.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/vehicles/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load vehicle.')
        return
      }

      const payload = (await response.json()) as { data: ManagedVehicle }
      const vehicle = payload.data
      setEditingId(vehicle.id)
      setForm({
        vehicle_code: vehicle.vehicle_code,
        plate_no: vehicle.plate_no,
        vin: vehicle.vin ?? '',
        type_id: String(vehicle.type_id),
        service_type: vehicle.service_type ?? 'administrative',
        current_location_id: vehicle.current_location_id ? String(vehicle.current_location_id) : '',
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year ? String(vehicle.year) : '',
        color: vehicle.color ?? '',
        transmission: vehicle.transmission ?? '',
        fuel_type: vehicle.fuel_type ?? '',
        seats: vehicle.seats ? String(vehicle.seats) : '',
        payload_kg: vehicle.payload_kg ?? '',
        odometer_km: vehicle.odometer_km,
        status: vehicle.status,
        registration_expiry: vehicle.registration_expiry ?? '',
        insurance_expiry: vehicle.insurance_expiry ?? '',
        notes: vehicle.notes ?? '',
      })
    } catch {
      setError('Unable to load vehicle.')
    }
  }

  const deleteVehicle = async (id: number) => {
    const confirmed = window.confirm('Delete this vehicle?')
    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/vehicles/item?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete vehicle.')
        return
      }

      await loadVehicleData()
      if (editingId === id) {
        resetForm()
      }
    } catch {
      setError('Unable to delete vehicle.')
    }
  }

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? `Edit Vehicle #${editingId}` : 'Create Vehicle'}
          </h3>
          {editingId ? (
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
              onClick={resetForm}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={submitForm}>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, vehicle_code: event.target.value }))} placeholder="Vehicle code" required value={form.vehicle_code} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, plate_no: event.target.value }))} placeholder="Plate no" required value={form.plate_no} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, vin: event.target.value }))} placeholder="VIN (optional)" value={form.vin} />
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, type_id: event.target.value }))} required value={form.type_id}>
            <option value="">Select type</option>
            {vehicleTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, service_type: event.target.value as 'ambulance' | 'administrative' }))} value={form.service_type}>
            <option value="administrative">administrative</option>
            <option value="ambulance">ambulance</option>
          </select>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, current_location_id: event.target.value }))} value={form.current_location_id}>
            <option value="">No location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} value={form.status}>
            <option value="available">available</option>
            <option value="reserved">reserved</option>
            <option value="in_use">in_use</option>
            <option value="maintenance">maintenance</option>
            <option value="inactive">inactive</option>
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, make: event.target.value }))} placeholder="Make" required value={form.make} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))} placeholder="Model" required value={form.model} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))} placeholder="Year" value={form.year} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} placeholder="Color" value={form.color} />
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, transmission: event.target.value }))} value={form.transmission}>
            <option value="">Transmission</option>
            <option value="manual">manual</option>
            <option value="automatic">automatic</option>
            <option value="cvt">cvt</option>
            <option value="other">other</option>
          </select>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, fuel_type: event.target.value }))} value={form.fuel_type}>
            <option value="">Fuel type</option>
            <option value="gasoline">gasoline</option>
            <option value="diesel">diesel</option>
            <option value="electric">electric</option>
            <option value="hybrid">hybrid</option>
            <option value="lpg">lpg</option>
            <option value="other">other</option>
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, seats: event.target.value }))} placeholder="Seats" value={form.seats} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, payload_kg: event.target.value }))} placeholder="Payload kg" value={form.payload_kg} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, odometer_km: event.target.value }))} placeholder="Odometer km" required value={form.odometer_km} />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Registration Expiry
            <input
              className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
              onChange={(event) => setForm((prev) => ({ ...prev, registration_expiry: event.target.value }))}
              type="date"
              value={form.registration_expiry}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Insurance Expiry
            <input
              className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_expiry: event.target.value }))}
              type="date"
              value={form.insurance_expiry}
            />
          </label>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-3" onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" value={form.notes} />
          <div className="md:col-span-3">
            <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Update Vehicle' : 'Create Vehicle'}
            </button>
          </div>
        </form>
      </article>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Vehicles</h3>
          <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadVehicleData()} type="button">
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Plate</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading vehicles...</td></tr>
              ) : null}
              {!loading && vehicles.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No vehicles found.</td></tr>
              ) : null}
              {!loading
                ? vehicles.map((vehicle) => (
                    <tr className="border-t border-slate-100" key={vehicle.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{vehicle.vehicle_code}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.plate_no}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.make} {vehicle.model}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.type_name}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.service_type}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{vehicle.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(vehicle.id)} type="button">Edit</button>
                          <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteVehicle(vehicle.id)} type="button">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

function SimplePage({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">Template section ready for your feature modules.</p>
    </section>
  )
}

export default App
