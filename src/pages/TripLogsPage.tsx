import { useEffect, useMemo, useState } from 'react'
import type { AuthUser, TripLogItem } from '../types'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'

function TripLogsPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<TripLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'completed'>('all')
  const [referenceFilter, setReferenceFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [detailTrip, setDetailTrip] = useState<TripLogItem | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<TripLogItem | null>(null)
  const [completionError, setCompletionError] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  })
  const [completionForm, setCompletionForm] = useState({
    check_in_at: '',
    end_odometer_km: '',
    fuel_used_liters: '',
    incident_report: '',
  })

  const canAccess = ['admin', 'manager', 'driver', 'cao'].includes(currentUser.role)
  const canCompleteTrips = ['admin', 'manager', 'driver'].includes(currentUser.role)
  const isDriver = currentUser.role === 'driver'

  const toSqlDateTime = (value: string): string => value.replace('T', ' ') + ':00'
  const toDateTimeLocal = (value: string): string => value.slice(0, 16).replace(' ', 'T')

  const loadTripLogs = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })

      const response = await fetch(`${apiBasePrefix}/api/trip-logs?${params.toString()}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load trip logs.')
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { data: TripLogItem[] }
      setItems(payload.data)
    } catch {
      setError('Unable to connect to trip log endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return
    }

    loadTripLogs().catch(() => setLoading(false))
  }, [startDate, endDate])

  const driverOptions = useMemo(
    () =>
      Array.from(
        new Map(
          items
            .filter((item) => item.driver_id !== null && item.driver_name)
            .map((item) => [item.driver_id as number, item.driver_name as string]),
        ).entries(),
      )
        .map(([id, name]) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [items],
  )

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (statusTab !== 'all' && item.status !== statusTab) {
          return false
        }

        if (
          referenceFilter.trim() !== '' &&
          !item.reservation_no.toLowerCase().includes(referenceFilter.trim().toLowerCase())
        ) {
          return false
        }

        if (driverFilter !== '' && item.driver_id !== Number(driverFilter)) {
          return false
        }

        return true
      }),
    [driverFilter, items, referenceFilter, statusTab],
  )
  const completionDistanceKm = useMemo(() => {
    if (!selectedTrip || selectedTrip.start_odometer_km === null || completionForm.end_odometer_km.trim() === '') {
      return ''
    }

    const startOdometer = Number(selectedTrip.start_odometer_km)
    const endOdometer = Number(completionForm.end_odometer_km)

    if (Number.isNaN(startOdometer) || Number.isNaN(endOdometer) || endOdometer < startOdometer) {
      return ''
    }

    return (endOdometer - startOdometer).toFixed(2)
  }, [completionForm.end_odometer_km, selectedTrip])

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredItems, statusTab, referenceFilter, driverFilter])

  const pageSize = 8
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [currentPage, filteredItems])

  const activeCount = items.filter((item) => item.status === 'active').length
  const completedCount = items.filter((item) => item.status === 'completed').length

  const openCompleteModal = (item: TripLogItem) => {
    const baseDateTime = item.check_out_at ?? item.actual_start_at ?? item.scheduled_end_at
    setSelectedTrip(item)
    setCompletionError('')
    setSuccessMessage('')
    setCompletionForm({
      check_in_at: toDateTimeLocal(baseDateTime),
      end_odometer_km: item.start_odometer_km ?? '',
      fuel_used_liters: item.fuel_used_liters ?? '',
      incident_report: item.incident_report ?? '',
    })
  }

  const closeCompleteModal = () => {
    setSelectedTrip(null)
    setCompletionError('')
    setCompletionForm({
      check_in_at: '',
      end_odometer_km: '',
      fuel_used_liters: '',
      incident_report: '',
    })
  }

  const completeTrip = async () => {
    if (!selectedTrip) {
      return
    }

    setCompletionError('')
    setSaving(true)
    setError('')
    setSuccessMessage('')

    const departureAt = selectedTrip.check_out_at ?? selectedTrip.actual_start_at
    const startOdometer = selectedTrip.start_odometer_km !== null
      ? Number(selectedTrip.start_odometer_km)
      : null
    const endOdometer = Number(completionForm.end_odometer_km)
    const fuelUsed = completionForm.fuel_used_liters.trim() === ''
      ? null
      : Number(completionForm.fuel_used_liters)
    const checkInAt = toSqlDateTime(completionForm.check_in_at)

    if (Number.isNaN(endOdometer)) {
      setCompletionError('Return odometer must be numeric.')
      setSaving(false)
      return
    }

    if (endOdometer < 0) {
      setCompletionError('Return odometer must be non-negative.')
      setSaving(false)
      return
    }

    if (startOdometer !== null && endOdometer < startOdometer) {
      setCompletionError('Return odometer cannot be lower than departure odometer.')
      setSaving(false)
      return
    }

    if (fuelUsed !== null && (Number.isNaN(fuelUsed) || fuelUsed < 0)) {
      setCompletionError('Fuel used must be blank or a non-negative number.')
      setSaving(false)
      return
    }

    if (departureAt !== null && checkInAt < departureAt) {
      setCompletionError('Return date/time cannot be earlier than departure date/time.')
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`${apiBasePrefix}/api/trip-logs/complete?id=${selectedTrip.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in_at: checkInAt,
          end_odometer_km: endOdometer,
          fuel_used_liters: fuelUsed,
          incident_report: completionForm.incident_report.trim(),
        }),
      })

      const body = (await response.json()) as { data?: TripLogItem; error?: string }

      if (!response.ok) {
        const message = body.error ?? 'Failed to complete trip.'
        setCompletionError(message)
        setError(message)
        setSaving(false)
        return
      }

      const responseTrip = body.data
      const submittedIncident = completionForm.incident_report.trim()

      if (
        !responseTrip ||
        responseTrip.status !== 'completed' ||
        responseTrip.check_in_at !== checkInAt ||
        responseTrip.end_odometer_km !== endOdometer.toFixed(2) ||
        (fuelUsed !== null && responseTrip.fuel_used_liters !== fuelUsed.toFixed(2)) ||
        (submittedIncident !== '' && responseTrip.incident_report?.trim() !== submittedIncident)
      ) {
        const message = 'Trip completion was acknowledged, but the returned trip data was not updated. Please refresh and try again.'
        setCompletionError(message)
        setError(message)
        setSaving(false)
        return
      }

      await loadTripLogs()
      closeCompleteModal()
      setSuccessMessage('Trip completed successfully.')
    } catch {
      setCompletionError('Unable to complete trip.')
      setError('Unable to complete trip.')
    } finally {
      setSaving(false)
    }
  }

  if (!canAccess) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Trip Logs</h3>
        <p className="mt-2 text-sm text-slate-600">Only manager/admin/driver/CAO can access trip logs.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <FormModal
        maxWidthClass="max-w-4xl"
        onClose={() => setDetailTrip(null)}
        open={detailTrip !== null}
        title={detailTrip ? `Trip Details: ${detailTrip.reservation_no}` : 'Trip Details'}
      >
        {detailTrip ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-700">Reservation:</span> {detailTrip.reservation_no}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Status:</span> {detailTrip.status}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Vehicle:</span> {detailTrip.vehicle_code} ({detailTrip.vehicle_name})
              </p>
              <p>
                <span className="font-semibold text-slate-700">Driver:</span> {detailTrip.driver_name ?? 'Unassigned'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Requester:</span> {detailTrip.requester_name}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Pickup Location:</span> {detailTrip.pickup_location_name ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Destination:</span> {detailTrip.destination ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Passengers:</span> {detailTrip.passengers ?? '-'}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-700">Purpose:</span> {detailTrip.purpose}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-700">Remarks:</span> {detailTrip.remarks?.trim() ? detailTrip.remarks : '-'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-700">Departure:</span> {detailTrip.scheduled_start_at}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Expected Return:</span> {detailTrip.scheduled_end_at}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Actual:</span> {detailTrip.actual_start_at ?? '-'} to {detailTrip.actual_end_at ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Check-out:</span> {detailTrip.check_out_at ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Check-in:</span> {detailTrip.check_in_at ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Start Odometer:</span> {detailTrip.start_odometer_km ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">End Odometer:</span> {detailTrip.end_odometer_km ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Distance:</span> {detailTrip.distance_km ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Fuel Used:</span> {detailTrip.fuel_used_liters ?? '-'}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-700">Incident / Notes:</span> {detailTrip.incident_report?.trim() ? detailTrip.incident_report : '-'}
              </p>
            </div>
          </div>
        ) : null}
      </FormModal>

      <FormModal
        onClose={closeCompleteModal}
        open={selectedTrip !== null}
        title={selectedTrip ? `Complete Trip: ${selectedTrip.reservation_no}` : 'Complete Trip'}
      >
        {selectedTrip ? (
          <div className="space-y-4">
            {completionError ? <p className="text-sm font-medium text-red-600">{completionError}</p> : null}
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-700">Vehicle:</span> {selectedTrip.vehicle_code} ({selectedTrip.vehicle_name})
              </p>
              <p>
                <span className="font-semibold text-slate-700">Driver:</span> {selectedTrip.driver_name ?? 'Unassigned'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Requester:</span> {selectedTrip.requester_name}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Departed:</span> {selectedTrip.check_out_at ?? selectedTrip.actual_start_at ?? '-'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Return Date/Time
                <input
                  className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  onChange={(event) => setCompletionForm((prev) => ({ ...prev, check_in_at: event.target.value }))}
                  type="datetime-local"
                  value={completionForm.check_in_at}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Odometer on Return (km)
                <input
                  className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  min={0}
                  onChange={(event) => setCompletionForm((prev) => ({ ...prev, end_odometer_km: event.target.value }))}
                  step="0.01"
                  type="number"
                  value={completionForm.end_odometer_km}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Fuel Used (liters)
                <input
                  className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  min={0}
                  onChange={(event) => setCompletionForm((prev) => ({ ...prev, fuel_used_liters: event.target.value }))}
                  step="0.01"
                  type="number"
                  value={completionForm.fuel_used_liters}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Total Distance (km)
                <input
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none"
                  readOnly
                  value={completionDistanceKm}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 md:col-span-2">
                Incident / Notes
                <textarea
                  className="min-h-28 rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  onChange={(event) => setCompletionForm((prev) => ({ ...prev, incident_report: event.target.value }))}
                  placeholder="Road incident, delay, return remarks, or leave blank."
                  value={completionForm.incident_report}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={saving || completionForm.check_in_at === '' || completionForm.end_odometer_km === ''}
                onClick={() => completeTrip().catch(() => setError('Failed to complete trip.'))}
                type="button"
              >
                {saving ? 'Completing...' : 'Complete Trip'}
              </button>
              <button
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                onClick={closeCompleteModal}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </FormModal>

      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_auto_1fr_auto_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">Start Date</span>
            <input className="w-full border-0 bg-transparent p-0 text-xs outline-none" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">End Date</span>
            <input className="w-full border-0 bg-transparent p-0 text-xs outline-none" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
          <input
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setReferenceFilter(event.target.value)}
            placeholder="Search reservation no"
            value={referenceFilter}
          />
          {!isDriver ? (
            <select
              className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
              onChange={(event) => setDriverFilter(event.target.value)}
              value={driverFilter}
            >
              <option value="">All drivers</option>
              {driverOptions.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
            onClick={() => loadTripLogs()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-teal-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Logs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{items.length}</p>
        </article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Active Trips</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">{activeCount}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Completed Trips</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{completedCount}</p>
        </article>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {successMessage ? <p className="text-sm font-medium text-emerald-700">{successMessage}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-teal-100 px-4 py-3">
          {[
            { key: 'all', label: `All (${items.length})` },
            { key: 'active', label: `Active (${activeCount})` },
            { key: 'completed', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusTab === tab.key
                  ? 'bg-teal-700 text-white'
                  : 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
              }`}
              key={tab.key}
              onClick={() => setStatusTab(tab.key as 'all' | 'active' | 'completed')}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Reservation</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Departure</th>
                <th className="px-4 py-3">Return</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    Loading trip logs...
                  </td>
                </tr>
              ) : null}

              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    No trip logs found for this range.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? pagedItems.map((item) => (
                    <tr className="border-t border-slate-100" key={item.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{item.reservation_no}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.purpose}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.vehicle_code} ({item.vehicle_name})
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.driver_name ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.check_out_at ?? item.actual_start_at ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.check_in_at ?? item.actual_end_at ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.distance_km ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.status === 'active'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                            onClick={() => setDetailTrip(item)}
                            type="button"
                          >
                            View Details
                          </button>
                          {item.status === 'active' && canCompleteTrips ? (
                            <button
                              className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                              onClick={() => openCompleteModal(item)}
                              type="button"
                            >
                              Complete Trip
                            </button>
                          ) : (
                            <span className="self-center text-xs text-slate-400">
                              {item.status === 'active' ? 'View only' : 'Completed'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
        {!loading ? (
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={filteredItems.length}
          />
        ) : null}
      </article>
    </div>
  )
}

export default TripLogsPage
