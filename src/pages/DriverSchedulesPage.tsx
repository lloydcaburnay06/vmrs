import { useEffect, useMemo, useState } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, DriverScheduleItem, VehicleOption } from '../types'

function DriverSchedulesPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<DriverScheduleItem[]>([])
  const [drivers, setDrivers] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [startingTravel, setStartingTravel] = useState(false)
  const [startingId, setStartingId] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<DriverScheduleItem | null>(null)
  const [error, setError] = useState('')
  const [startTravelForm, setStartTravelForm] = useState({
    check_out_at: '',
    start_odometer_km: '',
    remarks: '',
  })
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  })
  const [currentPage, setCurrentPage] = useState(1)

  const canManage = currentUser.role === 'admin' || currentUser.role === 'manager'
  const canAccess = canManage || currentUser.role === 'driver'
  const toSqlDateTime = (value: string): string => value.replace('T', ' ') + ':00'
  const toDateTimeLocalValue = (value: string): string => value.slice(0, 16).replace(' ', 'T')

  const loadSchedule = async () => {
    setLoading(true)
    setError('')

    try {
      const schedulePromise = fetch(`${apiBasePrefix}/api/driver-schedules?start_date=${startDate}&end_date=${endDate}`)
      const driversPromise = canManage
        ? fetch(`${apiBasePrefix}/api/travel-requests/driver-options`)
        : Promise.resolve(null)
      const [scheduleRes, driversRes] = await Promise.all([schedulePromise, driversPromise])

      if (!scheduleRes.ok || (driversRes !== null && !driversRes.ok)) {
        const statusCode = !scheduleRes.ok ? scheduleRes.status : driversRes?.status ?? 500
        setError(
          statusCode === 403
            ? 'Only manager/admin/driver can access driver schedules.'
            : 'Failed to load driver schedules.',
        )
        setLoading(false)
        return
      }

      const schedulePayload = (await scheduleRes.json()) as { data: DriverScheduleItem[] }
      setItems(schedulePayload.data)
      if (driversRes !== null) {
        const driversPayload = (await driversRes.json()) as { data: VehicleOption[] }
        setDrivers(driversPayload.data)
      } else {
        setDrivers([])
      }
    } catch {
      setError('Unable to connect to driver schedule endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule().catch(() => setLoading(false))
  }, [startDate, endDate])

  const readyItems = useMemo(
    () => [...items].sort((left, right) => left.start_at.localeCompare(right.start_at)),
    [items],
  )
  const pageSize = 8
  const pagedReadyItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return readyItems.slice(start, start + pageSize)
  }, [currentPage, readyItems])

  useEffect(() => {
    setCurrentPage(1)
  }, [readyItems])

  const openStartTravel = (item: DriverScheduleItem) => {
    setStartingId(item.id)
    setStartTravelForm({
      check_out_at: toDateTimeLocalValue(item.start_at),
      start_odometer_km: '',
      remarks: '',
    })
  }

  const closeStartTravel = () => {
    setStartingId(null)
    setStartTravelForm({
      check_out_at: '',
      start_odometer_km: '',
      remarks: '',
    })
  }

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

  const startTravel = async (id: number) => {
    setStartingTravel(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-schedules/start-travel?id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_out_at: toSqlDateTime(startTravelForm.check_out_at),
          start_odometer_km: Number(startTravelForm.start_odometer_km),
          remarks: startTravelForm.remarks.trim(),
        }),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to start travel.')
        setStartingTravel(false)
        return
      }

      await loadSchedule()
      closeStartTravel()
    } catch {
      setError('Unable to start travel.')
    } finally {
      setStartingTravel(false)
    }
  }

  if (!canAccess) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Driver Schedules</h3>
        <p className="mt-2 text-sm text-slate-600">Only manager/admin/driver can access driver schedules.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <FormModal
        maxWidthClass="max-w-4xl"
        onClose={() => setSelectedItem(null)}
        open={selectedItem !== null}
        title={selectedItem ? `Trip Details: ${selectedItem.reservation_no}` : 'Trip Details'}
      >
        {selectedItem ? (
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-700">Reservation:</span> {selectedItem.reservation_no}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Status:</span> {selectedItem.status}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Vehicle:</span> {selectedItem.vehicle_code} ({selectedItem.vehicle_name})
            </p>
            <p>
              <span className="font-semibold text-slate-700">Assigned Driver:</span> {selectedItem.driver_name ?? 'Unassigned'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Requester:</span> {selectedItem.requester_name}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Pickup Location:</span> {selectedItem.pickup_location_name ?? '-'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Destination:</span> {selectedItem.destination ?? '-'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Passengers:</span> {selectedItem.passengers ?? '-'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Expected Return:</span> {selectedItem.end_at}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Departure:</span> {selectedItem.start_at}
            </p>
            <p className="md:col-span-2">
              <span className="font-semibold text-slate-700">Purpose:</span> {selectedItem.purpose}
            </p>
            <p className="md:col-span-2">
              <span className="font-semibold text-slate-700">Remarks:</span> {selectedItem.remarks?.trim() ? selectedItem.remarks : '-'}
            </p>
          </div>
        ) : null}
      </FormModal>

      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">Start Date</span>
            <input className="w-full border-0 bg-transparent p-0 text-xs outline-none" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">End Date</span>
            <input className="w-full border-0 bg-transparent p-0 text-xs outline-none" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
        </div>
      </article>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        {loading ? <p className="text-sm text-slate-500">Loading driver schedules...</p> : null}
        {!loading && readyItems.length === 0 ? <p className="text-sm text-slate-500">No approved trips ready for travel in this range.</p> : null}

        {!loading
          ? pagedReadyItems.map((item) => (
              <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/40 p-3" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.reservation_no} - {item.vehicle_code} ({item.vehicle_name})
                  </p>
                  <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{item.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{item.start_at} to {item.end_at}</p>
                <p className="mt-1 text-sm text-slate-700">Requester: {item.requester_name}</p>
                <p className="mt-1 text-sm text-slate-700">Assigned Driver: {item.driver_name ?? 'Unassigned'}</p>
                <p className="mt-1 text-sm text-slate-700">{item.purpose}</p>

                {canManage ? (
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

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                    onClick={() => setSelectedItem(item)}
                    type="button"
                  >
                    View Details
                  </button>
                  {startingId !== item.id ? (
                    <button className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700" onClick={() => openStartTravel(item)} type="button">
                      Start Travel
                    </button>
                  ) : null}
                </div>

                {startingId === item.id ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-emerald-100 bg-white p-3 md:grid-cols-3">
                    <label className="flex flex-col gap-2 text-xs font-medium text-slate-600 md:col-span-2">
                      Departure Date/Time
                      <input className="w-full rounded-lg border border-teal-200 px-2.5 py-2 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setStartTravelForm((prev) => ({ ...prev, check_out_at: event.target.value }))} type="datetime-local" value={startTravelForm.check_out_at} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Odometer on Departure (km)
                      <input className="rounded-lg border border-teal-200 px-2.5 py-2 text-sm outline-none ring-teal-400 focus:ring" min={0} onChange={(event) => setStartTravelForm((prev) => ({ ...prev, start_odometer_km: event.target.value }))} step="0.01" type="number" value={startTravelForm.start_odometer_km} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 md:col-span-3">
                      Remarks
                      <textarea className="min-h-24 rounded-lg border border-teal-200 px-2.5 py-2 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setStartTravelForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Notes" value={startTravelForm.remarks} />
                    </label>
                    <div className="md:col-span-3 flex flex-wrap gap-2">
                      <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={startingTravel || startTravelForm.check_out_at === '' || startTravelForm.start_odometer_km === ''} onClick={() => startTravel(item.id).catch(() => setError('Failed to start travel.'))} type="button">
                        {startingTravel ? 'Starting...' : 'Confirm Start'}
                      </button>
                      <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700" onClick={closeStartTravel} type="button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          : null}
        {!loading ? (
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={readyItems.length}
          />
        ) : null}
      </article>
    </div>
  )
}


export default DriverSchedulesPage

