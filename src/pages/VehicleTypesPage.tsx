import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, ManagedVehicleType } from '../types'

function VehicleTypesPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<ManagedVehicleType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
  })
  const canAccess = currentUser.role === 'admin' || currentUser.role === 'manager'

  const loadVehicleTypes = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/admin/vehicle-types`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load vehicle types.')
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { data: ManagedVehicleType[] }
      setItems(payload.data)
    } catch {
      setError('Unable to connect to vehicle type endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return
    }

    loadVehicleTypes().catch(() => setLoading(false))
  }, [canAccess])

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (searchFilter.trim() === '') {
          return true
        }

        const needle = searchFilter.trim().toLowerCase()
        return item.name.toLowerCase().includes(needle) || (item.description ?? '').toLowerCase().includes(needle)
      }),
    [items, searchFilter],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredItems])

  const pageSize = 10
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [currentPage, filteredItems])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', description: '' })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/admin/vehicle-types/item?id=${editingId}`
      : `${apiBasePrefix}/api/admin/vehicle-types`

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save vehicle type.')
        setSaving(false)
        return
      }

      await loadVehicleTypes()
      resetForm()
    } catch {
      setError('Unable to save vehicle type.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/admin/vehicle-types/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load vehicle type.')
        return
      }

      const payload = (await response.json()) as { data: ManagedVehicleType }
      const item = payload.data
      setEditingId(item.id)
      setForm({
        name: item.name,
        description: item.description ?? '',
      })
      setShowForm(true)
    } catch {
      setError('Unable to load vehicle type.')
    }
  }

  const deleteItem = async (id: number) => {
    const confirmed = window.confirm('Delete this vehicle type?')
    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/admin/vehicle-types/item?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete vehicle type.')
        return
      }

      await loadVehicleTypes()
    } catch {
      setError('Unable to delete vehicle type.')
    }
  }

  return !canAccess ? (
    <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
      <h3 className="text-xl font-semibold text-slate-900">Vehicle Types</h3>
      <p className="mt-2 text-sm text-slate-600">Only admin and manager users can access vehicle types.</p>
    </section>
  ) : (
    <div className="space-y-5">
      <FormModal onClose={resetForm} open={showForm} title={editingId ? `Edit Vehicle Type #${editingId}` : 'Create Vehicle Type'}>
        <form className="grid grid-cols-1 gap-3" onSubmit={submitForm}>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Type name" required value={form.name} />
          <textarea className="min-h-28 rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" value={form.description} />
          <div>
            <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Update Vehicle Type' : 'Create Vehicle Type'}
            </button>
          </div>
        </form>
      </FormModal>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Vehicle Types</h3>
          <div className="flex items-center gap-2">
            <button className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800" onClick={() => { resetForm(); setShowForm(true) }} type="button">Create New</button>
            <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadVehicleTypes()} type="button">Refresh</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-b border-teal-100 px-4 py-3 md:grid-cols-[1fr_auto]">
          <input className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring" onChange={(event) => setSearchFilter(event.target.value)} placeholder="Search name or description" value={searchFilter} />
          <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800 transition hover:bg-teal-50" onClick={() => setSearchFilter('')} type="button">Clear Search</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className="px-4 py-6 text-slate-500" colSpan={3}>Loading vehicle types...</td></tr> : null}
              {!loading && filteredItems.length === 0 ? <tr><td className="px-4 py-6 text-slate-500" colSpan={3}>No vehicle types found.</td></tr> : null}
              {!loading ? pagedItems.map((item) => (
                <tr className="border-t border-slate-100" key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-700">{item.description ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(item.id)} type="button">Edit</button>
                      <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteItem(item.id)} type="button">Delete</button>
                    </div>
                  </td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>
        {!loading ? <Pagination currentPage={currentPage} onPageChange={setCurrentPage} pageSize={pageSize} totalItems={filteredItems.length} /> : null}
      </article>
    </div>
  )
}

export default VehicleTypesPage
