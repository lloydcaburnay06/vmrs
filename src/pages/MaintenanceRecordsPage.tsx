import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, MaintenanceRecordItem, ManagedVehicle } from '../types'

function MaintenanceRecordsPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<MaintenanceRecordItem[]>([])
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusTab, setStatusTab] = useState<'all' | MaintenanceRecordItem['status']>('all')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    vehicle_id: '',
    maintenance_type: 'preventive' as MaintenanceRecordItem['maintenance_type'],
    description: '',
    vendor: '',
    service_date: '',
    odometer_km: '',
    cost: '',
    next_service_date: '',
    status: 'open' as MaintenanceRecordItem['status'],
  })
  const canAccess = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'cao'
  const canManage = currentUser.role === 'admin' || currentUser.role === 'manager'

  const loadMaintenanceData = async () => {
    setLoading(true)
    setError('')

    try {
      const [maintenanceResponse, vehiclesResponse] = await Promise.all([
        fetch(`${apiBasePrefix}/api/maintenance-records`),
        fetch(`${apiBasePrefix}/api/vehicles`),
      ])

      if (!maintenanceResponse.ok || !vehiclesResponse.ok) {
        const statusCode = !maintenanceResponse.ok ? maintenanceResponse.status : vehiclesResponse.status
        setError(
          statusCode === 403
            ? 'Only admin, manager, and CAO users can access maintenance records.'
            : 'Failed to load maintenance data.',
        )
        setLoading(false)
        return
      }

      const maintenancePayload = (await maintenanceResponse.json()) as { data: MaintenanceRecordItem[] }
      const vehiclesPayload = (await vehiclesResponse.json()) as { data: ManagedVehicle[] }

      setItems(maintenancePayload.data)
      setVehicles(vehiclesPayload.data)
    } catch {
      setError('Unable to connect to maintenance endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return
    }

    loadMaintenanceData().catch(() => setLoading(false))
  }, [canAccess])

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (statusTab !== 'all' && item.status !== statusTab) {
          return false
        }

        if (vehicleFilter !== '' && item.vehicle_id !== Number(vehicleFilter)) {
          return false
        }

        if (searchFilter.trim() !== '') {
          const needle = searchFilter.trim().toLowerCase()
          const haystacks = [
            item.vehicle_code,
            item.vehicle_name,
            item.description,
            item.vendor ?? '',
            item.recorded_by_name ?? '',
          ]
          if (!haystacks.some((value) => value.toLowerCase().includes(needle))) {
            return false
          }
        }

        return true
      }),
    [items, searchFilter, statusTab, vehicleFilter],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredItems])

  const pageSize = 10
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [currentPage, filteredItems])

  const openCount = items.filter((item) => item.status === 'open').length
  const inProgressCount = items.filter((item) => item.status === 'in_progress').length
  const completedCount = items.filter((item) => item.status === 'completed').length

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({
      vehicle_id: '',
      maintenance_type: 'preventive',
      description: '',
      vendor: '',
      service_date: '',
      odometer_km: '',
      cost: '',
      next_service_date: '',
      status: 'open',
    })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      vehicle_id: Number(form.vehicle_id),
      maintenance_type: form.maintenance_type,
      description: form.description.trim(),
      vendor: form.vendor.trim(),
      service_date: form.service_date,
      odometer_km: form.odometer_km.trim() === '' ? null : Number(form.odometer_km),
      cost: form.cost.trim() === '' ? null : Number(form.cost),
      next_service_date: form.next_service_date.trim() === '' ? null : form.next_service_date,
      status: form.status,
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/maintenance-records/item?id=${editingId}`
      : `${apiBasePrefix}/api/maintenance-records`

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
        setError(body.error ?? 'Failed to save maintenance record.')
        setSaving(false)
        return
      }

      await loadMaintenanceData()
      resetForm()
    } catch {
      setError('Unable to save maintenance record.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/maintenance-records/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load maintenance record.')
        return
      }

      const payload = (await response.json()) as { data: MaintenanceRecordItem }
      const record = payload.data
      setShowForm(true)
      setEditingId(record.id)
      setForm({
        vehicle_id: String(record.vehicle_id),
        maintenance_type: record.maintenance_type,
        description: record.description,
        vendor: record.vendor ?? '',
        service_date: record.service_date,
        odometer_km: record.odometer_km ?? '',
        cost: record.cost ?? '',
        next_service_date: record.next_service_date ?? '',
        status: record.status,
      })
    } catch {
      setError('Unable to load maintenance record.')
    }
  }

  const deleteRecord = async (id: number) => {
    const confirmed = window.confirm('Delete this maintenance record?')
    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/maintenance-records/item?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete maintenance record.')
        return
      }

      await loadMaintenanceData()
      if (editingId === id) {
        resetForm()
      }
    } catch {
      setError('Unable to delete maintenance record.')
    }
  }

  const statusBadgeClass = (status: MaintenanceRecordItem['status']) => {
    switch (status) {
      case 'open':
        return 'bg-amber-100 text-amber-800'
      case 'in_progress':
        return 'bg-sky-100 text-sky-800'
      case 'completed':
        return 'bg-emerald-100 text-emerald-800'
      case 'cancelled':
        return 'bg-slate-200 text-slate-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return !canAccess ? (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Maintenance Records</h3>
        <p className="mt-2 text-sm text-slate-600">Only admin, manager, and CAO users can access maintenance records.</p>
      </section>
    ) : (
    <div className="space-y-5">
      {!canManage ? <p className="text-sm text-slate-600">CAO access is view-only for maintenance records.</p> : null}
      <FormModal
        maxWidthClass="max-w-4xl"
        onClose={resetForm}
        open={showForm && canManage}
        title={editingId ? `Edit Maintenance #${editingId}` : 'Create Maintenance Record'}
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
          <select
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, maintenance_type: event.target.value as MaintenanceRecordItem['maintenance_type'] }))}
            value={form.maintenance_type}
          >
            <option value="preventive">preventive</option>
            <option value="corrective">corrective</option>
            <option value="inspection">inspection</option>
            <option value="emergency">emergency</option>
          </select>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Service Date
            <input
              className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
              onChange={(event) => setForm((prev) => ({ ...prev, service_date: event.target.value }))}
              required
              type="date"
              value={form.service_date}
            />
          </label>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as MaintenanceRecordItem['status'] }))}
            value={form.status}
          >
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value }))}
            placeholder="Vendor / service provider"
            value={form.vendor}
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
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            min={0}
            onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
            placeholder="Cost"
            step="0.01"
            type="number"
            value={form.cost}
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Next Service Date
            <input
              className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
              onChange={(event) => setForm((prev) => ({ ...prev, next_service_date: event.target.value }))}
              type="date"
              value={form.next_service_date}
            />
          </label>
          <textarea
            className="min-h-28 rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-2"
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description of maintenance work"
            required
            value={form.description}
          />
          <div className="md:col-span-2">
            <button
              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving...' : editingId ? 'Update Record' : 'Create Record'}
            </button>
          </div>
        </form>
      </FormModal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Open</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">{openCount}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-sky-700">In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-sky-900">{inProgressCount}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{completedCount}</p>
        </article>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Maintenance Records</h3>
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
              onClick={() => loadMaintenanceData()}
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-teal-100 px-4 py-3">
          {[
            { key: 'all', label: `All (${items.length})` },
            { key: 'open', label: `Open (${openCount})` },
            { key: 'in_progress', label: `In Progress (${inProgressCount})` },
            { key: 'completed', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusTab === tab.key
                  ? 'bg-teal-700 text-white'
                  : 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
              }`}
              key={tab.key}
              onClick={() => setStatusTab(tab.key as 'all' | MaintenanceRecordItem['status'])}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-teal-100 px-4 py-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search vehicle, vendor, or description"
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
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800 transition hover:bg-teal-50"
            onClick={() => {
              setSearchFilter('')
              setVehicleFilter('')
              setStatusTab('all')
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
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Service Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    Loading maintenance records...
                  </td>
                </tr>
              ) : null}

              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    No maintenance records found.
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
                      <td className="px-4 py-3 text-slate-700">
                        <p>{item.maintenance_type}</p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.service_date}</td>
                      <td className="px-4 py-3 text-slate-700">{item.vendor ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.cost ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
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
                              onClick={() => deleteRecord(item.id)}
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

export default MaintenanceRecordsPage
