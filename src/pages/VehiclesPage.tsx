import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, ManagedVehicle, VehicleOption } from '../types'

function VehiclesPage({ currentUser }: { currentUser: AuthUser }) {
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<VehicleOption[]>([])
  const [locations, setLocations] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
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
  const canView = ['admin', 'manager', 'cao'].includes(currentUser.role)
  const canManage = currentUser.role === 'admin'

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
            ? 'Only admin, manager, and CAO users can access vehicles.'
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

  useEffect(() => {
    setCurrentPage(1)
  }, [vehicles])

  const pageSize = 10
  const pagedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return vehicles.slice(start, start + pageSize)
  }, [currentPage, vehicles])

  const resetForm = () => {
    setShowForm(false)
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
    } catch {
      setError('Unable to delete vehicle.')
    }
  }

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

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {!canManage ? <p className="text-sm text-slate-600">CAO and manager access is view-only for vehicle records.</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Vehicles</h3>
          <div className="flex items-center gap-2">
            {canManage ? (
              <button
                className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                onClick={() => {
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
                ? pagedVehicles.map((vehicle) => (
                    <tr className="border-t border-slate-100" key={vehicle.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{vehicle.vehicle_code}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.plate_no}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.make} {vehicle.model}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.type_name}</td>
                      <td className="px-4 py-3 text-slate-700">{vehicle.service_type}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{vehicle.status}</span></td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex gap-2">
                            <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(vehicle.id)} type="button">Edit</button>
                            <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteVehicle(vehicle.id)} type="button">Delete</button>
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
            totalItems={vehicles.length}
          />
        ) : null}
      </article>
    </div>
  )
}


export default VehiclesPage

