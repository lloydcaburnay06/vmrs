import { useEffect, useMemo, useState } from 'react'
import { apiBasePrefix } from '../config'
import type {
  AuthUser,
  FuelLogItem,
  MaintenanceRecordItem,
  ManagedVehicle,
  TravelRequestItem,
  TripLogItem,
} from '../types'

const formatMoney = (value: number) => value.toFixed(2)
const formatLabel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const inRange = (value: string, startDate: string, endDate: string) => {
  const date = value.slice(0, 10)
  return date >= startDate && date <= endDate
}

function ReportsPage({ currentUser }: { currentUser: AuthUser }) {
  const [requests, setRequests] = useState<TravelRequestItem[]>([])
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRecordItem[]>([])
  const [fuelLogs, setFuelLogs] = useState<FuelLogItem[]>([])
  const [tripLogs, setTripLogs] = useState<TripLogItem[]>([])
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

  const canAccess = currentUser.role === 'admin' || currentUser.role === 'manager'

  const loadReports = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })

      const [requestsResponse, vehiclesResponse, maintenanceResponse, fuelResponse, tripsResponse] = await Promise.all([
        fetch(`${apiBasePrefix}/api/travel-requests`),
        fetch(`${apiBasePrefix}/api/vehicles`),
        fetch(`${apiBasePrefix}/api/maintenance-records`),
        fetch(`${apiBasePrefix}/api/fuel-logs`),
        fetch(`${apiBasePrefix}/api/trip-logs?${params.toString()}`),
      ])

      if (
        !requestsResponse.ok ||
        !vehiclesResponse.ok ||
        !maintenanceResponse.ok ||
        !fuelResponse.ok ||
        !tripsResponse.ok
      ) {
        setError('Failed to load report data.')
        setLoading(false)
        return
      }

      const requestsPayload = (await requestsResponse.json()) as { data: TravelRequestItem[] }
      const vehiclesPayload = (await vehiclesResponse.json()) as { data: ManagedVehicle[] }
      const maintenancePayload = (await maintenanceResponse.json()) as { data: MaintenanceRecordItem[] }
      const fuelPayload = (await fuelResponse.json()) as { data: FuelLogItem[] }
      const tripsPayload = (await tripsResponse.json()) as { data: TripLogItem[] }

      setRequests(requestsPayload.data)
      setVehicles(vehiclesPayload.data)
      setMaintenance(maintenancePayload.data)
      setFuelLogs(fuelPayload.data)
      setTripLogs(tripsPayload.data)
    } catch {
      setError('Unable to connect to report endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return
    }

    loadReports().catch(() => setLoading(false))
  }, [canAccess, startDate, endDate])

  const filteredRequests = useMemo(
    () => requests.filter((item) => inRange(item.start_at, startDate, endDate)),
    [endDate, requests, startDate],
  )
  const filteredMaintenance = useMemo(
    () => maintenance.filter((item) => inRange(item.service_date, startDate, endDate)),
    [endDate, maintenance, startDate],
  )
  const filteredFuel = useMemo(
    () => fuelLogs.filter((item) => inRange(item.fueled_at, startDate, endDate)),
    [endDate, fuelLogs, startDate],
  )

  const requestStatusCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of filteredRequests) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((left, right) => right.count - left.count)
  }, [filteredRequests])

  const utilizationRows = useMemo(() => {
    const rows = vehicles.map((vehicle) => {
      const vehicleTrips = tripLogs.filter((trip) => trip.vehicle_id === vehicle.id)
      const tripCount = vehicleTrips.length
      const completedCount = vehicleTrips.filter((trip) => trip.status === 'completed').length
      const distanceKm = vehicleTrips.reduce((sum, trip) => sum + Number(trip.distance_km ?? 0), 0)
      const fuelUsed = vehicleTrips.reduce((sum, trip) => sum + Number(trip.fuel_used_liters ?? 0), 0)

      return {
        id: vehicle.id,
        vehicle_code: vehicle.vehicle_code,
        vehicle_name: `${vehicle.make} ${vehicle.model}`,
        trip_count: tripCount,
        completed_count: completedCount,
        distance_km: distanceKm,
        fuel_used: fuelUsed,
      }
    })

    return rows.filter((row) => row.trip_count > 0).sort((left, right) => right.trip_count - left.trip_count).slice(0, 8)
  }, [tripLogs, vehicles])

  const spendRows = useMemo(() => {
    const rows = vehicles.map((vehicle) => {
      const fuelCost = filteredFuel
        .filter((item) => item.vehicle_id === vehicle.id)
        .reduce((sum, item) => sum + Number(item.total_cost ?? 0), 0)
      const maintenanceCost = filteredMaintenance
        .filter((item) => item.vehicle_id === vehicle.id)
        .reduce((sum, item) => sum + Number(item.cost ?? 0), 0)

      return {
        id: vehicle.id,
        vehicle_code: vehicle.vehicle_code,
        vehicle_name: `${vehicle.make} ${vehicle.model}`,
        fuel_cost: fuelCost,
        maintenance_cost: maintenanceCost,
        total_cost: fuelCost + maintenanceCost,
      }
    })

    return rows.filter((row) => row.total_cost > 0).sort((left, right) => right.total_cost - left.total_cost).slice(0, 8)
  }, [filteredFuel, filteredMaintenance, vehicles])

  const documentRows = useMemo(() => {
    const today = new Date()
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() + 60)

    return vehicles
      .filter((vehicle) => {
        const registration = vehicle.registration_expiry ? new Date(vehicle.registration_expiry) : null
        const insurance = vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry) : null

        return (
          (registration !== null && registration <= cutoff) ||
          (insurance !== null && insurance <= cutoff)
        )
      })
      .sort((left, right) => {
        const leftExpiry = left.registration_expiry ?? left.insurance_expiry ?? '9999-12-31'
        const rightExpiry = right.registration_expiry ?? right.insurance_expiry ?? '9999-12-31'
        return leftExpiry.localeCompare(rightExpiry)
      })
      .slice(0, 8)
  }, [vehicles])

  if (!canAccess) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Reports</h3>
        <p className="mt-2 text-sm text-slate-600">Only admin and manager users can access reports.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_auto_1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">Start Date</span>
            <input
              className="w-full border-0 bg-transparent p-0 text-xs outline-none"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">End Date</span>
            <input
              className="w-full border-0 bg-transparent p-0 text-xs outline-none"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs text-slate-600">
            Operational report covering requests, trips, fuel, maintenance, and compliance watch.
          </div>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
            onClick={() => loadReports()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </article>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-700">Requests in Range</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-900">{loading ? '--' : filteredRequests.length}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Completed Trips</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">
            {loading ? '--' : tripLogs.filter((item) => item.status === 'completed').length}
          </p>
        </article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Fuel Cost</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">
            {loading ? '--' : formatMoney(filteredFuel.reduce((sum, item) => sum + Number(item.total_cost ?? 0), 0))}
          </p>
        </article>
        <article className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-rose-700">Maintenance Cost</p>
          <p className="mt-2 text-3xl font-semibold text-rose-900">
            {loading ? '--' : formatMoney(filteredMaintenance.reduce((sum, item) => sum + Number(item.cost ?? 0), 0))}
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-teal-100 bg-white">
          <div className="border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Request Status Breakdown</h3>
          </div>
          <div className="space-y-3 px-4 py-4">
            {requestStatusCounts.length > 0 ? (
              requestStatusCounts.map((item) => (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2" key={item.status}>
                  <span className="text-sm text-slate-700">{formatLabel(item.status)}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">{loading ? 'Loading request mix...' : 'No requests in range.'}</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-teal-100 bg-white xl:col-span-2">
          <div className="border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Vehicle Utilization</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Trips</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Fuel Used</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>
                      Loading utilization report...
                    </td>
                  </tr>
                ) : utilizationRows.length > 0 ? (
                  utilizationRows.map((row) => (
                    <tr className="border-t border-slate-100" key={row.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.vehicle_code}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.vehicle_name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.trip_count}</td>
                      <td className="px-4 py-3 text-slate-700">{row.completed_count}</td>
                      <td className="px-4 py-3 text-slate-700">{row.distance_km.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-700">{row.fuel_used.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>
                      No trip activity in the selected range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-teal-100 bg-white">
          <div className="border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Operating Spend by Vehicle</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Fuel</th>
                  <th className="px-4 py-3">Maintenance</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>
                      Loading spend report...
                    </td>
                  </tr>
                ) : spendRows.length > 0 ? (
                  spendRows.map((row) => (
                    <tr className="border-t border-slate-100" key={row.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.vehicle_code}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.vehicle_name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatMoney(row.fuel_cost)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatMoney(row.maintenance_cost)}</td>
                      <td className="px-4 py-3 text-slate-900">{formatMoney(row.total_cost)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>
                      No operating spend in the selected range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-teal-100 bg-white">
          <div className="border-b border-teal-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Compliance Watch</h3>
            <p className="mt-1 text-xs text-slate-500">Vehicles with registration or insurance due within 60 days</p>
          </div>
          <div className="space-y-3 px-4 py-4">
            {loading ? (
              <p className="text-sm text-slate-500">Loading compliance watch...</p>
            ) : documentRows.length > 0 ? (
              documentRows.map((vehicle) => (
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3" key={vehicle.id}>
                  <p className="text-sm font-semibold text-slate-900">
                    {vehicle.vehicle_code}{' '}
                    <span className="font-normal text-slate-600">
                      {vehicle.make} {vehicle.model}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Registration: {vehicle.registration_expiry ?? 'n/a'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Insurance: {vehicle.insurance_expiry ?? 'n/a'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No near-term document expiries found.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}

export default ReportsPage
