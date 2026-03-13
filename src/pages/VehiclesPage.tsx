import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type {
  AuthUser,
  FuelLogItem,
  MaintenanceRecordItem,
  ManagedVehicle,
  TripLogItem,
  VehicleOption,
} from '../types'

const createEmptyVehicleForm = () => ({
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

function VehiclesPage({ currentUser }: { currentUser: AuthUser }) {
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<VehicleOption[]>([])
  const [locations, setLocations] = useState<VehicleOption[]>([])
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecordItem[]>([])
  const [fuelLogs, setFuelLogs] = useState<FuelLogItem[]>([])
  const [tripLogs, setTripLogs] = useState<TripLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState<'all' | ManagedVehicle['service_type']>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ManagedVehicle['status']>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [form, setForm] = useState(createEmptyVehicleForm)
  const canView = ['admin', 'manager', 'cao'].includes(currentUser.role)
  const canManage = currentUser.role === 'admin'

  const loadVehicleData = async () => {
    setLoading(true)
    setError('')

    try {
      const tripParams = new URLSearchParams({
        start_date: '2000-01-01',
        end_date: '2100-12-31',
      })

      const [
        vehiclesResponse,
        typesResponse,
        locationsResponse,
        maintenanceResponse,
        fuelLogsResponse,
        tripLogsResponse,
      ] = await Promise.all([
        fetch(`${apiBasePrefix}/api/vehicles`),
        fetch(`${apiBasePrefix}/api/vehicle-types`),
        fetch(`${apiBasePrefix}/api/locations`),
        fetch(`${apiBasePrefix}/api/maintenance-records`),
        fetch(`${apiBasePrefix}/api/fuel-logs`),
        fetch(`${apiBasePrefix}/api/trip-logs?${tripParams.toString()}`),
      ])

      if (
        !vehiclesResponse.ok ||
        !typesResponse.ok ||
        !locationsResponse.ok ||
        !maintenanceResponse.ok ||
        !fuelLogsResponse.ok ||
        !tripLogsResponse.ok
      ) {
        const statusCode = !vehiclesResponse.ok
          ? vehiclesResponse.status
          : !typesResponse.ok
            ? typesResponse.status
            : !locationsResponse.ok
              ? locationsResponse.status
              : !maintenanceResponse.ok
                ? maintenanceResponse.status
                : !fuelLogsResponse.ok
                  ? fuelLogsResponse.status
                  : tripLogsResponse.status

        setError(
          statusCode === 403
            ? 'Only admin, manager, and CAO users can access vehicle records.'
            : 'Failed to load vehicle data.',
        )
        setLoading(false)
        return
      }

      const vehiclesPayload = (await vehiclesResponse.json()) as { data: ManagedVehicle[] }
      const typesPayload = (await typesResponse.json()) as { data: VehicleOption[] }
      const locationsPayload = (await locationsResponse.json()) as { data: VehicleOption[] }
      const maintenancePayload = (await maintenanceResponse.json()) as { data: MaintenanceRecordItem[] }
      const fuelLogsPayload = (await fuelLogsResponse.json()) as { data: FuelLogItem[] }
      const tripLogsPayload = (await tripLogsResponse.json()) as { data: TripLogItem[] }

      setVehicles(vehiclesPayload.data)
      setVehicleTypes(typesPayload.data)
      setLocations(locationsPayload.data)
      setMaintenanceRecords(maintenancePayload.data)
      setFuelLogs(fuelLogsPayload.data)
      setTripLogs(tripLogsPayload.data)
    } catch {
      setError('Unable to connect to vehicle management endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canView) {
      return
    }

    loadVehicleData().catch(() => setLoading(false))
  }, [canView])

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        if (serviceFilter !== 'all' && vehicle.service_type !== serviceFilter) {
          return false
        }

        if (statusFilter !== 'all' && vehicle.status !== statusFilter) {
          return false
        }

        if (searchFilter.trim() !== '') {
          const needle = searchFilter.trim().toLowerCase()
          const haystacks = [
            vehicle.vehicle_code,
            vehicle.plate_no,
            vehicle.make,
            vehicle.model,
            vehicle.type_name,
            vehicle.location_name ?? '',
            vehicle.notes ?? '',
          ]

          if (!haystacks.some((value) => value.toLowerCase().includes(needle))) {
            return false
          }
        }

        return true
      }),
    [searchFilter, serviceFilter, statusFilter, vehicles],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredVehicles])

  const pageSize = 10
  const pagedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredVehicles.slice(start, start + pageSize)
  }, [currentPage, filteredVehicles])

  const selectedVehicle = selectedVehicleId !== null
    ? vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null
    : null

  const selectedVehicleMaintenanceRecords = useMemo(
    () =>
      selectedVehicleId === null
        ? []
        : maintenanceRecords.filter((item) => item.vehicle_id === selectedVehicleId),
    [maintenanceRecords, selectedVehicleId],
  )
  const selectedVehicleFuelLogs = useMemo(
    () =>
      selectedVehicleId === null
        ? []
        : fuelLogs.filter((item) => item.vehicle_id === selectedVehicleId),
    [fuelLogs, selectedVehicleId],
  )
  const selectedVehicleTripLogs = useMemo(
    () =>
      selectedVehicleId === null
        ? []
        : tripLogs.filter((item) => item.vehicle_id === selectedVehicleId),
    [selectedVehicleId, tripLogs],
  )

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(createEmptyVehicleForm())
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
      setShowForm(true)
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
      if (selectedVehicleId === id) {
        setSelectedVehicleId(null)
      }
    } catch {
      setError('Unable to delete vehicle.')
    }
  }

  const vehicleStatusBadgeClass = (status: ManagedVehicle['status']) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800'
      case 'reserved':
        return 'bg-sky-100 text-sky-800'
      case 'in_use':
        return 'bg-cyan-100 text-cyan-800'
      case 'maintenance':
        return 'bg-amber-100 text-amber-800'
      case 'inactive':
        return 'bg-slate-200 text-slate-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const maintenanceStatusBadgeClass = (status: MaintenanceRecordItem['status']) => {
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

  const tripStatusBadgeClass = (status: TripLogItem['status']) =>
    status === 'active'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-emerald-100 text-emerald-800'

  const vehicleCounts = useMemo(() => ({
    total: vehicles.length,
    maintenance: maintenanceRecords.length,
    fuel: fuelLogs.length,
    trips: tripLogs.length,
  }), [fuelLogs.length, maintenanceRecords.length, tripLogs.length, vehicles.length])

  const getVehicleCounts = (vehicleId: number) => ({
    maintenance: maintenanceRecords.filter((item) => item.vehicle_id === vehicleId).length,
    fuel: fuelLogs.filter((item) => item.vehicle_id === vehicleId).length,
    trips: tripLogs.filter((item) => item.vehicle_id === vehicleId).length,
  })

  if (!canView) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Vehicles</h3>
        <p className="mt-2 text-sm text-slate-600">Only admin, manager, and CAO users can access vehicles.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <FormModal onClose={resetForm} open={showForm && canManage} title={editingId ? `Edit Vehicle #${editingId}` : 'Create Vehicle'}>
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
      </FormModal>

      <FormModal
        maxWidthClass="max-w-6xl"
        onClose={() => setSelectedVehicleId(null)}
        open={selectedVehicle !== null}
        title={selectedVehicle ? `Vehicle Record: ${selectedVehicle.vehicle_code}` : 'Vehicle Record'}
      >
        {selectedVehicle ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <article className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-teal-700">Vehicle Profile</p>
                    <h4 className="mt-2 text-xl font-semibold text-slate-900">
                      {selectedVehicle.make} {selectedVehicle.model}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedVehicle.vehicle_code} · Plate {selectedVehicle.plate_no}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vehicleStatusBadgeClass(selectedVehicle.status)}`}>
                    {selectedVehicle.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <p><span className="font-semibold text-slate-700">Type:</span> {selectedVehicle.type_name}</p>
                  <p><span className="font-semibold text-slate-700">Service:</span> {selectedVehicle.service_type}</p>
                  <p><span className="font-semibold text-slate-700">Location:</span> {selectedVehicle.location_name ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Odometer:</span> {selectedVehicle.odometer_km}</p>
                  <p><span className="font-semibold text-slate-700">VIN:</span> {selectedVehicle.vin ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Fuel Type:</span> {selectedVehicle.fuel_type ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Transmission:</span> {selectedVehicle.transmission ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Seats:</span> {selectedVehicle.seats ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Payload:</span> {selectedVehicle.payload_kg ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Color:</span> {selectedVehicle.color ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Registration Expiry:</span> {selectedVehicle.registration_expiry ?? '-'}</p>
                  <p><span className="font-semibold text-slate-700">Insurance Expiry:</span> {selectedVehicle.insurance_expiry ?? '-'}</p>
                  <p className="md:col-span-2"><span className="font-semibold text-slate-700">Notes:</span> {selectedVehicle.notes?.trim() ? selectedVehicle.notes : '-'}</p>
                </div>
              </article>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-700">Maintenance Records</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-900">{selectedVehicleMaintenanceRecords.length}</p>
                </article>
                <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-cyan-700">Fuel Logs</p>
                  <p className="mt-2 text-3xl font-semibold text-cyan-900">{selectedVehicleFuelLogs.length}</p>
                </article>
                <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Trip Logs</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-900">{selectedVehicleTripLogs.length}</p>
                </article>
              </div>
            </div>

            <article className="rounded-2xl border border-teal-100 bg-white">
              <div className="border-b border-teal-100 px-4 py-3">
                <h4 className="text-sm font-semibold text-slate-900">Maintenance History</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Service Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Cost</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVehicleMaintenanceRecords.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={6}>No maintenance records found for this vehicle.</td>
                      </tr>
                    ) : (
                      selectedVehicleMaintenanceRecords.map((item) => (
                        <tr className="border-t border-slate-100" key={item.id}>
                          <td className="px-4 py-3 text-slate-700">{item.service_date}</td>
                          <td className="px-4 py-3 text-slate-700">{item.maintenance_type}</td>
                          <td className="px-4 py-3 text-slate-700">{item.vendor ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{item.cost ?? '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${maintenanceStatusBadgeClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p>{item.description}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Next service: {item.next_service_date ?? '-'} · Odometer: {item.odometer_km ?? '-'}
                            </p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-teal-100 bg-white">
              <div className="border-b border-teal-100 px-4 py-3">
                <h4 className="text-sm font-semibold text-slate-900">Fuel Log History</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Fueled At</th>
                      <th className="px-4 py-3">Liters</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3">Total Cost</th>
                      <th className="px-4 py-3">Station</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVehicleFuelLogs.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={6}>No fuel logs found for this vehicle.</td>
                      </tr>
                    ) : (
                      selectedVehicleFuelLogs.map((item) => (
                        <tr className="border-t border-slate-100" key={item.id}>
                          <td className="px-4 py-3 text-slate-700">{item.fueled_at}</td>
                          <td className="px-4 py-3 text-slate-700">{item.liters}</td>
                          <td className="px-4 py-3 text-slate-700">{item.unit_price ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{item.total_cost ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{item.fuel_station ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <p>{item.notes?.trim() ? item.notes : '-'}</p>
                            <p className="mt-1 text-xs text-slate-500">Odometer: {item.odometer_km ?? '-'}</p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-teal-100 bg-white">
              <div className="border-b border-teal-100 px-4 py-3">
                <h4 className="text-sm font-semibold text-slate-900">Trip Log History</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Reservation</th>
                      <th className="px-4 py-3">Driver</th>
                      <th className="px-4 py-3">Departure</th>
                      <th className="px-4 py-3">Return</th>
                      <th className="px-4 py-3">Distance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVehicleTripLogs.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={7}>No trip logs found for this vehicle.</td>
                      </tr>
                    ) : (
                      selectedVehicleTripLogs.map((item) => (
                        <tr className="border-t border-slate-100" key={item.id}>
                          <td className="px-4 py-3 text-slate-700">
                            <p className="font-medium text-slate-900">{item.reservation_no}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.purpose}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item.driver_name ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{item.check_out_at ?? item.actual_start_at ?? item.scheduled_start_at}</td>
                          <td className="px-4 py-3 text-slate-700">{item.check_in_at ?? item.actual_end_at ?? item.scheduled_end_at}</td>
                          <td className="px-4 py-3 text-slate-700">{item.distance_km ?? '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tripStatusBadgeClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p>Requester: {item.requester_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Fuel used: {item.fuel_used_liters ?? '-'} · Notes: {item.incident_report?.trim() ? item.incident_report : '-'}
                            </p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        ) : null}
      </FormModal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-700">Vehicles</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-900">{vehicleCounts.total}</p>
        </article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Maintenance Entries</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">{vehicleCounts.maintenance}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-sky-700">Fuel Logs</p>
          <p className="mt-2 text-3xl font-semibold text-sky-900">{vehicleCounts.fuel}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Trip Logs</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{vehicleCounts.trips}</p>
        </article>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {!canManage ? <p className="text-sm text-slate-600">Manager and CAO access is view-only for vehicles, but full record history is available per vehicle.</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Vehicles</h3>
            <p className="mt-1 text-xs text-slate-500">Open a vehicle to see its maintenance records, fuel logs, and trip logs.</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <button
                className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                onClick={() => {
                  setEditingId(null)
                  setForm(createEmptyVehicleForm())
                  setShowForm(true)
                }}
                type="button"
              >
                Create New
              </button>
            ) : null}
            <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadVehicleData()} type="button">
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-teal-100 px-4 py-3 md:grid-cols-4">
          <input
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search code, plate, make, model"
            value={searchFilter}
          />
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setServiceFilter(event.target.value as 'all' | ManagedVehicle['service_type'])}
            value={serviceFilter}
          >
            <option value="all">All services</option>
            <option value="administrative">administrative</option>
            <option value="ambulance">ambulance</option>
          </select>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ManagedVehicle['status'])}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="available">available</option>
            <option value="reserved">reserved</option>
            <option value="in_use">in_use</option>
            <option value="maintenance">maintenance</option>
            <option value="inactive">inactive</option>
          </select>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800 transition hover:bg-teal-50"
            onClick={() => {
              setSearchFilter('')
              setServiceFilter('all')
              setStatusFilter('all')
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
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Plate</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">History</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading vehicles...</td></tr>
              ) : null}
              {!loading && filteredVehicles.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No vehicles found.</td></tr>
              ) : null}
              {!loading
                ? pagedVehicles.map((vehicle) => {
                    const counts = getVehicleCounts(vehicle.id)

                    return (
                      <tr className="border-t border-slate-100" key={vehicle.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{vehicle.vehicle_code}</td>
                        <td className="px-4 py-3 text-slate-700">{vehicle.plate_no}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <p>{vehicle.make} {vehicle.model}</p>
                          <p className="mt-1 text-xs text-slate-500">{vehicle.location_name ?? 'No location assigned'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p>{vehicle.type_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{vehicle.service_type}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vehicleStatusBadgeClass(vehicle.status)}`}>
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p className="text-xs">Maintenance: {counts.maintenance}</p>
                          <p className="mt-1 text-xs">Fuel: {counts.fuel}</p>
                          <p className="mt-1 text-xs">Trips: {counts.trips}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                              onClick={() => setSelectedVehicleId(vehicle.id)}
                              type="button"
                            >
                              View History
                            </button>
                            {canManage ? (
                              <>
                                <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(vehicle.id)} type="button">Edit</button>
                                <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteVehicle(vehicle.id)} type="button">Delete</button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                : null}
            </tbody>
          </table>
        </div>
        {!loading ? (
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={filteredVehicles.length}
          />
        ) : null}
      </article>
    </div>
  )
}

export default VehiclesPage
