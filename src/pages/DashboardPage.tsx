import { useEffect, useMemo, useState } from 'react'
import { apiBasePrefix } from '../config'
import type { DashboardSummary } from '../types'

const statusTone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  active: 'bg-cyan-100 text-cyan-800',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-200 text-slate-700',
  no_show: 'bg-rose-100 text-rose-800',
  available: 'bg-emerald-100 text-emerald-800',
  reserved: 'bg-sky-100 text-sky-800',
  in_use: 'bg-cyan-100 text-cyan-800',
  maintenance: 'bg-amber-100 text-amber-800',
  inactive: 'bg-slate-200 text-slate-700',
}

const formatLabel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDays = (value: number | null) => {
  if (value === null) {
    return 'n/a'
  }
  if (value < 0) {
    return `${Math.abs(value)} day(s) overdue`
  }
  if (value === 0) {
    return 'Due today'
  }
  return `${value} day(s) left`
}

function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadSummary = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/dashboard/summary`)
      if (!response.ok) {
        setError('Failed to load dashboard summary.')
        setLoading(false)
        return
      }

      const data = (await response.json()) as DashboardSummary
      setSummary(data)
      setLastUpdated(new Date())
    } catch {
      setError('Unable to connect to dashboard endpoint.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary().catch(() => setLoading(false))
  }, [])

  const metricCards = useMemo(() => {
    if (!summary) {
      return []
    }

    return [
      {
        label: 'Total Requests',
        value: summary.metrics.total_requests,
        accent: 'border-cyan-100 bg-cyan-50/70 text-cyan-900',
      },
      {
        label: 'Pending Requests',
        value: summary.metrics.pending_requests,
        accent: 'border-amber-100 bg-amber-50/70 text-amber-900',
      },
      {
        label: 'Unassigned Approvals',
        value: summary.metrics.approved_unassigned,
        accent: 'border-blue-100 bg-blue-50/70 text-blue-900',
      },
      {
        label: 'Active Trips',
        value: summary.metrics.active_trips,
        accent: 'border-emerald-100 bg-emerald-50/70 text-emerald-900',
      },
      {
        label: 'Completed This Month',
        value: summary.metrics.completed_this_month,
        accent: 'border-teal-100 bg-teal-50/70 text-teal-900',
      },
      {
        label: 'Available Vehicles',
        value: summary.metrics.available_vehicles,
        accent: 'border-lime-100 bg-lime-100/60 text-emerald-900',
      },
      {
        label: 'Vehicles in Maintenance',
        value: summary.metrics.vehicles_in_maintenance,
        accent: 'border-orange-100 bg-orange-50 text-amber-900',
      },
      {
        label: 'Active Drivers',
        value: summary.metrics.active_drivers,
        accent: 'border-slate-200 bg-slate-50 text-slate-900',
      },
    ]
  }, [summary])

  const chartMax = useMemo(() => {
    const max = Math.max(...(summary?.daily_trip_counts ?? []).map((entry) => entry.count), 0)
    return max > 0 ? max : 1
  }, [summary])

  const chartPoints = useMemo(() => {
    const series = summary?.daily_trip_counts ?? []
    const width = 660
    const height = 220
    const left = 40
    const right = 16
    const top = 18
    const bottom = 32
    const usableWidth = width - left - right
    const usableHeight = height - top - bottom

    return series.map((entry, index) => ({
      ...entry,
      x: left + (series.length <= 1 ? 0 : (index / (series.length - 1)) * usableWidth),
      y: top + (1 - entry.count / chartMax) * usableHeight,
    }))
  }, [chartMax, summary])

  const chartPath = useMemo(() => {
    if (chartPoints.length === 0) {
      return ''
    }

    if (chartPoints.length === 1) {
      return `M ${chartPoints[0].x} ${chartPoints[0].y}`
    }

    let path = `M ${chartPoints[0].x} ${chartPoints[0].y}`
    for (let index = 1; index < chartPoints.length; index += 1) {
      const previous = chartPoints[index - 1]
      const current = chartPoints[index]
      const controlX = (previous.x + current.x) / 2
      path += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`
    }

    return path
  }, [chartPoints])

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) {
      return ''
    }

    const baseline = 188
    return `${chartPath} L ${chartPoints[chartPoints.length - 1].x} ${baseline} L ${chartPoints[0].x} ${baseline} Z`
  }, [chartPath, chartPoints])

  const totalTripsInTrend = useMemo(
    () => (summary?.daily_trip_counts ?? []).reduce((total, entry) => total + entry.count, 0),
    [summary],
  )

  const peakDay = useMemo(() => {
    if (!summary || summary.daily_trip_counts.length === 0) {
      return null
    }

    return summary.daily_trip_counts.reduce((peak, current) => (current.count > peak.count ? current : peak))
  }, [summary])

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-700">Operations Dashboard</p>
            <h2 className="text-xl font-semibold text-slate-900">MRH Vehicle Management Overview</h2>
            <p className="mt-1 text-sm text-slate-600">
              {summary?.scopeLabel ?? 'Loading dashboard scope...'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : 'Live operational snapshot'}
            </p>
          </div>
          <button
            className="rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-50"
            onClick={() => loadSummary().catch(() => setError('Failed to refresh dashboard.'))}
            type="button"
          >
            {loading ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
        </div>
      </article>

      {error ? (
        <article className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <article className={`rounded-2xl border p-4 ${card.accent}`} key={card.label}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{loading ? '--' : card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-700">Fuel This Month</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-900">
            {loading ? '--' : summary?.fuel_snapshot.entries_this_month ?? 0} entries
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Liters: {(summary?.fuel_snapshot.liters_this_month ?? 0).toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Cost: {(summary?.fuel_snapshot.cost_this_month ?? 0).toFixed(2)}
          </p>
        </article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Maintenance This Month</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">
            {loading ? '--' : summary?.maintenance_snapshot.completed_this_month ?? 0} completed
          </p>
          <p className="mt-2 text-sm text-slate-700">Open: {summary?.maintenance_snapshot.open ?? 0}</p>
          <p className="mt-1 text-sm text-slate-700">
            In progress: {summary?.maintenance_snapshot.in_progress ?? 0}
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Trip Trend</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{loading ? '--' : totalTripsInTrend}</p>
          <p className="mt-2 text-sm text-slate-700">Trips in the last 21 days</p>
          <p className="mt-1 text-sm text-slate-700">
            Peak day: {peakDay ? `${peakDay.count} on ${peakDay.label}` : 'No trip activity'}
          </p>
        </article>
      </div>

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Trip Activity Trend</h3>
            <p className="text-xs text-slate-500">Last 21 days of active, completed, and no-show trips</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            Total trips: {totalTripsInTrend}
          </span>
        </div>
        <div className="px-2 py-3 md:px-4">
          {loading ? (
            <p className="px-2 py-4 text-sm text-slate-500">Loading trip activity trend...</p>
          ) : summary && totalTripsInTrend > 0 ? (
            <div className="w-full">
              <svg className="h-64 w-full" preserveAspectRatio="xMidYMid meet" viewBox="0 0 660 220">
                <defs>
                  <linearGradient id="tripTrendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.04" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((step) => {
                  const y = 18 + (step / 4) * 170
                  const value = Math.round(chartMax - (step / 4) * chartMax)
                  return (
                    <g key={step}>
                      <line stroke="#dbe5e7" strokeDasharray="3 3" x1={40} x2={644} y1={y} y2={y} />
                      <text fill="#6b7280" fontSize="10" textAnchor="end" x={34} y={y + 3}>
                        {value}
                      </text>
                    </g>
                  )
                })}
                <path d={areaPath} fill="url(#tripTrendGradient)" />
                <path
                  d={chartPath}
                  fill="none"
                  stroke="#0f766e"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                {chartPoints.map((point, index) => (
                  <g key={point.date}>
                    <circle cx={point.x} cy={point.y} fill="#0f766e" r="3.5" />
                    <title>{`${point.label}: ${point.count} trip(s)`}</title>
                    {index % 3 === 0 || index === chartPoints.length - 1 ? (
                      <text fill="#6b7280" fontSize="10" textAnchor="middle" x={point.x} y={210}>
                        {point.label}
                      </text>
                    ) : null}
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <p className="px-2 py-4 text-sm text-slate-500">No trip activity in the last 21 days.</p>
          )}
        </div>
      </article>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-teal-100 bg-white">
          <div className="border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Request Status Mix</h3>
          </div>
          <div className="space-y-3 px-4 py-4">
            {(summary?.request_statuses ?? []).length > 0 ? (
              summary?.request_statuses.map((item) => (
                <div className="space-y-1" key={item.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatLabel(item.status)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[item.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{
                        width: `${Math.max(
                          8,
                          summary ? (item.count / Math.max(summary.metrics.total_requests, 1)) * 100 : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No request status data available.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-teal-100 bg-white">
          <div className="border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Fleet Status Mix</h3>
          </div>
          <div className="space-y-3 px-4 py-4">
            {(summary?.fleet_statuses ?? []).length > 0 ? (
              summary?.fleet_statuses.map((item) => (
                <div className="space-y-1" key={item.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatLabel(item.status)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[item.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-cyan-600"
                      style={{
                        width: `${Math.max(
                          8,
                          summary
                            ? (item.count /
                                Math.max(
                                  summary.fleet_statuses.reduce((total, row) => total + row.count, 0),
                                  1,
                                )) *
                                100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No fleet status data available.</p>
            )}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-amber-100 bg-white">
          <div className="border-b border-amber-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Vehicle Documents</h3>
            <p className="mt-1 text-xs text-slate-500">Registration and insurance due within 30 days</p>
          </div>
          <div className="space-y-3 px-4 py-4">
            {(summary?.urgent_items.vehicle_documents ?? []).length > 0 ? (
              summary?.urgent_items.vehicle_documents.map((item) => (
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3" key={item.id}>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.vehicle_code} <span className="font-normal text-slate-600">{item.vehicle_name}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Registration: {item.registration_expiry ?? 'n/a'} ({formatDays(item.days_to_registration)})
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Insurance: {item.insurance_expiry ?? 'n/a'} ({formatDays(item.days_to_insurance)})
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No vehicle document alerts.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-rose-100 bg-white">
          <div className="border-b border-rose-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Driver License Alerts</h3>
            <p className="mt-1 text-xs text-slate-500">Active drivers with licenses due within 30 days</p>
          </div>
          <div className="space-y-3 px-4 py-4">
            {(summary?.urgent_items.driver_licenses ?? []).length > 0 ? (
              summary?.urgent_items.driver_licenses.map((item) => (
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3" key={item.id}>
                  <p className="text-sm font-semibold text-slate-900">{item.driver_name}</p>
                  <p className="mt-1 text-xs text-slate-600">Expiry: {item.license_expiry}</p>
                  <p className="mt-1 text-xs text-slate-600">{formatDays(item.days_remaining)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No driver license alerts.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-sky-100 bg-white">
          <div className="border-b border-sky-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Maintenance Due</h3>
            <p className="mt-1 text-xs text-slate-500">Upcoming service schedules within 30 days</p>
          </div>
          <div className="space-y-3 px-4 py-4">
            {(summary?.urgent_items.maintenance_due ?? []).length > 0 ? (
              summary?.urgent_items.maintenance_due.map((item) => (
                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3" key={item.id}>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.vehicle_code} <span className="font-normal text-slate-600">{item.vehicle_name}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Next service: {item.next_service_date}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatDays(item.days_remaining)} · {formatLabel(item.status)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No maintenance due alerts.</p>
            )}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-teal-100 bg-white">
          <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Recent Requests</h3>
            <span className="text-xs text-slate-500">Latest 6</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && (summary?.recent_requests.length ?? 0) > 0 ? (
                  summary?.recent_requests.map((item) => (
                    <tr className="border-t border-slate-100" key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.reservation_no}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.start_at}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{item.requester_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.purpose}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{item.vehicle_code}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.driver_name ?? 'No driver assigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[item.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {formatLabel(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : null}
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>
                      Loading recent requests...
                    </td>
                  </tr>
                ) : null}
                {!loading && (summary?.recent_requests.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>
                      No recent requests available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-teal-100 bg-white">
          <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Recent Trips</h3>
            <span className="text-xs text-slate-500">Latest 6</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && (summary?.recent_trips.length ?? 0) > 0 ? (
                  summary?.recent_trips.map((item) => (
                    <tr className="border-t border-slate-100" key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.reservation_no}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.check_out_at ?? '-'} to {item.check_in_at ?? 'In progress'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{item.vehicle_code}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Distance: {item.distance_km ?? '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.driver_name ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[item.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {formatLabel(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : null}
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>
                      Loading recent trips...
                    </td>
                  </tr>
                ) : null}
                {!loading && (summary?.recent_trips.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>
                      No recent trips available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </div>
  )
}

export default DashboardPage
