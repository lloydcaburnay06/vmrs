import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, ManagedDriver } from '../types'
import { formatDate } from '../utils/dateTime'

function DriversPage({ currentUser }: { currentUser: AuthUser }) {
  const [drivers, setDrivers] = useState<ManagedDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
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
  const canView = currentUser.role === 'admin' || currentUser.role === 'cao'
  const canManage = currentUser.role === 'admin'

  const loadDrivers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/drivers`)

      if (!response.ok) {
        const code = response.status
        setError(code === 403 ? 'Only admin and CAO users can access drivers.' : 'Failed to load drivers.')
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

  useEffect(() => {
    setCurrentPage(1)
  }, [drivers])

  const pageSize = 10
  const pagedDrivers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return drivers.slice(start, start + pageSize)
  }, [currentPage, drivers])

  const resetForm = () => {
    setShowForm(false)
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
      setShowForm(true)
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

  if (!canView) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Drivers</h3>
        <p className="mt-2 text-sm text-slate-600">Only admin and CAO users can access drivers.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <FormModal onClose={resetForm} open={showForm && canManage} title={editingId ? `Edit Driver #${editingId}` : 'Create Driver'}>
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
      </FormModal>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {!canManage ? <p className="text-sm text-slate-600">CAO access is view-only for driver records.</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Driver Accounts</h3>
          <div className="flex items-center gap-2">
            {canManage ? (
              <button
                className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                onClick={() => {
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
                  setShowForm(true)
                }}
                type="button"
              >
                Create New
              </button>
            ) : null}
            <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadDrivers()} type="button">
              Refresh
            </button>
          </div>
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
                ? pagedDrivers.map((driver) => (
                    <tr className="border-t border-slate-100" key={driver.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{driver.first_name} {driver.last_name}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.email}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.dl_id_number ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.license_expiry ? formatDate(driver.license_expiry) : '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{driver.assignment_type ?? '-'}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{driver.status}</span></td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex gap-2">
                            <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(driver.id)} type="button">Edit</button>
                            <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteDriver(driver.id)} type="button">Delete</button>
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
            totalItems={drivers.length}
          />
        ) : null}
      </article>
    </div>
  )
}


export default DriversPage

