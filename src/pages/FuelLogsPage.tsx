import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, FuelLogItem, ManagedVehicle } from '../types'

function FuelLogsPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<FuelLogItem[]>([])
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    vehicle_id: '',
    fueled_at: '',
    odometer_km: '',
    liters: '',
    unit_price: '',
    total_cost: '',
    fuel_station: '',
    notes: '',
  })
  const canAccess = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'cao'
  const canManage = currentUser.role === 'admin' || currentUser.role === 'manager'

  const toSqlDateTime = (value: string): string => value.replace('T', ' ') + ':00'
  const toDateTimeLocal = (value: string): string => value.slice(0, 16).replace(' ', 'T')

  const loadFuelData = async () => {
    setLoading(true)
    setError('')

    try {
      const [fuelResponse, vehiclesResponse] = await Promise.all([
        fetch(`${apiBasePrefix}/api/fuel-logs`),
        fetch(`${apiBasePrefix}/api/vehicles`),
      ])

      if (!fuelResponse.ok || !vehiclesResponse.ok) {
        const statusCode = !fuelResponse.ok ? fuelResponse.status : vehiclesResponse.status
        setError(
          statusCode === 403
            ? 'Only admin, manager, and CAO users can access fuel logs.'
            : 'Failed to load fuel log data.',
        )
        setLoading(false)
        return
      }

      const fuelPayload = (await fuelResponse.json()) as { data: FuelLogItem[] }
      const vehiclesPayload = (await vehiclesResponse.json()) as { data: ManagedVehicle[] }

      setItems(fuelPayload.data)
      setVehicles(vehiclesPayload.data)
    } catch {
      setError('Unable to connect to fuel log endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return
    }

    loadFuelData().catch(() => setLoading(false))
  }, [canAccess])

  const stationOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.fuel_station).filter((value): value is string => Boolean(value))),
      ).sort((left, right) => left.localeCompare(right)),
    [items],
  )

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (vehicleFilter !== '' && item.vehicle_id !== Number(vehicleFilter)) {
          return false
        }

        if (stationFilter !== '' && item.fuel_station !== stationFilter) {
          return false
        }

        if (searchFilter.trim() !== '') {
          const needle = searchFilter.trim().toLowerCase()
          const haystacks = [
            item.vehicle_code,
            item.vehicle_name,
            item.fuel_station ?? '',
            item.recorded_by_name ?? '',
            item.notes ?? '',
          ]
          if (!haystacks.some((value) => value.toLowerCase().includes(needle))) {
            return false
          }
        }

        return true
      }),
    [items, searchFilter, stationFilter, vehicleFilter],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredItems])

  const pageSize = 10
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [currentPage, filteredItems])

  const totalLiters = useMemo(
    () => filteredItems.reduce((sum, item) => sum + Number(item.liters || 0), 0),
    [filteredItems],
  )
  const totalCost = useMemo(
    () => filteredItems.reduce((sum, item) => sum + Number(item.total_cost || 0), 0),
    [filteredItems],
  )
  const latestFuelDate = filteredItems.length > 0 ? filteredItems[0].fueled_at : null

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({
      vehicle_id: '',
      fueled_at: '',
      odometer_km: '',
      liters: '',
      unit_price: '',
      total_cost: '',
      fuel_station: '',
      notes: '',
    })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      vehicle_id: Number(form.vehicle_id),
      fueled_at: toSqlDateTime(form.fueled_at),
      odometer_km: form.odometer_km.trim() === '' ? null : Number(form.odometer_km),
      liters: Number(form.liters),
      unit_price: form.unit_price.trim() === '' ? null : Number(form.unit_price),
      total_cost: form.total_cost.trim() === '' ? null : Number(form.total_cost),
      fuel_station: form.fuel_station.trim(),
      notes: form.notes.trim(),
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/fuel-logs/item?id=${editingId}`
      : `${apiBasePrefix}/api/fuel-logs`

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
        setError(body.error ?? 'Failed to save fuel log.')
        setSaving(false)
        return
      }

      await loadFuelData()
      resetForm()
    } catch {
      setError('Unable to save fuel log.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/fuel-logs/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load fuel log.')
        return
      }

      const payload = (await response.json()) as { data: FuelLogItem }
      const log = payload.data
      setShowForm(true)
      setEditingId(log.id)
      setForm({
        vehicle_id: String(log.vehicle_id),
        fueled_at: toDateTimeLocal(log.fueled_at),
        odometer_km: log.odometer_km ?? '',
        liters: log.liters,
        unit_price: log.unit_price ?? '',
        total_cost: log.total_cost ?? '',
        fuel_station: log.fuel_station ?? '',
        notes: log.notes ?? '',
      })
    } catch {
      setError('Unable to load fuel log.')
    }
  }

  const deleteLog = async (id: number) => {
    const confirmed = window.confirm('Delete this fuel log?')
    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/fuel-logs/item?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete fuel log.')
        return
      }

      await loadFuelData()
      if (editingId === id) {
        resetForm()
      }
    } catch {
      setError('Unable to delete fuel log.')
    }
  }

  return !canAccess ? (
    <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
      <h3 className="text-xl font-semibold text-slate-900">Fuel Logs</h3>
      <p className="mt-2 text-sm text-slate-600">Only admin, manager, and CAO users can access fuel logs.</p>
    </section>
  ) : (
    <div className="space-y-5">
      {!canManage ? <p className="text-sm text-slate-600">CAO access is view-only for fuel logs.</p> : null}
      <FormModal
        maxWidthClass="max-w-4xl"
        onClose={resetForm}
        open={showForm && canManage}
        title={editingId ? `Edit Fuel Log #${editingId}` : 'Create Fuel Log'}
      >
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitForm}>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, vehicle_id: event.target.value }))}
            required
            value={form.vehicle_id}
          >
            <option value="">Select vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_code} - {vehicle.make} {vehicle.model}
              </option>
            ))}
          </select>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Fueled At
            <input
              className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
              onChange={(event) => setForm((prev) => ({ ...prev, fueled_at: event.target.value }))}
              required
              type="datetime-local"
              value={form.fueled_at}
            />
          </label>
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            min={0}
            onChange={(event) => setForm((prev) => ({ ...prev, liters: event.target.value }))}
            placeholder="Liters"
            required
            step="0.01"
            type="number"
            value={form.liters}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            min={0}
            onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))}
            placeholder="Unit price"
            step="0.01"
            type="number"
            value={form.unit_price}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            min={0}
            onChange={(event) => setForm((prev) => ({ ...prev, total_cost: event.target.value }))}
            placeholder="Total cost"
            step="0.01"
            type="number"
            value={form.total_cost}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            min={0}
            onChange={(event) => setForm((prev) => ({ ...prev, odometer_km: event.target.value }))}
            placeholder="Odometer km"
            step="0.01"
            type="number"
            value={form.odometer_km}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-2"
            onChange={(event) => setForm((prev) => ({ ...prev, fuel_station: event.target.value }))}
            placeholder="Fuel station"
            value={form.fuel_station}
          />
          <textarea
            className="min-h-28 rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-2"
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            value={form.notes}
          />
          <div className="md:col-span-2">
            <button
              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving...' : editingId ? 'Update Log' : 'Create Log'}
            </button>
          </div>
        </form>
      </FormModal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-700">Fuel Entries</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-900">{filteredItems.length}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Total Liters</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{totalLiters.toFixed(2)}</p>
        </article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Total Cost</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">{totalCost.toFixed(2)}</p>
        </article>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Fuel Logs</h3>
            <p className="mt-1 text-xs text-slate-500">
              {latestFuelDate ? `Latest entry: ${latestFuelDate}` : 'No fuel log entries yet.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <button
                className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                onClick={() => {
                  setEditingId(null)
                  resetForm()
                  setShowForm(true)
                }}
                type="button"
              >
                Create New
              </button>
            ) : null}
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
              onClick={() => loadFuelData()}
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-teal-100 px-4 py-3 md:grid-cols-4">
          <input
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search station, notes, or vehicle"
            value={searchFilter}
          />
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setVehicleFilter(event.target.value)}
            value={vehicleFilter}
          >
            <option value="">All vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_code} - {vehicle.make} {vehicle.model}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setStationFilter(event.target.value)}
            value={stationFilter}
          >
            <option value="">All fuel stations</option>
            {stationOptions.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800 transition hover:bg-teal-50"
            onClick={() => {
              setSearchFilter('')
              setVehicleFilter('')
              setStationFilter('')
            }}
            type="button"
          >
            Clear Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Fueled At</th>
                <th className="px-4 py-3">Liters</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Total Cost</th>
                <th className="px-4 py-3">Station</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    Loading fuel logs...
                  </td>
                </tr>
              ) : null}

              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    No fuel logs found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? pagedItems.map((item) => (
                    <tr className="border-t border-slate-100" key={item.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{item.vehicle_code}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.vehicle_name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.fueled_at}</td>
                      <td className="px-4 py-3 text-slate-700">{item.liters}</td>
                      <td className="px-4 py-3 text-slate-700">{item.unit_price ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.total_cost ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.fuel_station ?? '-'}</td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex gap-2">
                            <button
                              className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                              onClick={() => startEdit(item.id)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700"
                              onClick={() => deleteLog(item.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">View only</span>
                        )}
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

export default FuelLogsPage
