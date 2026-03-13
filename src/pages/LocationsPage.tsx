import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, ManagedLocation } from '../types'

function LocationsPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<ManagedLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    address_line: '',
    city: '',
    state: '',
    postal_code: '',
    is_active: true,
  })
  const canAccess = currentUser.role === 'admin' || currentUser.role === 'manager'

  const loadLocations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/admin/locations`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load locations.')
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { data: ManagedLocation[] }
      setItems(payload.data)
    } catch {
      setError('Unable to connect to location endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return
    }

    loadLocations().catch(() => setLoading(false))
  }, [canAccess])

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter === 'active' && !item.is_active) {
          return false
        }
        if (statusFilter === 'inactive' && item.is_active) {
          return false
        }
        if (searchFilter.trim() !== '') {
          const needle = searchFilter.trim().toLowerCase()
          const haystacks = [
            item.name,
            item.address_line ?? '',
            item.city ?? '',
            item.state ?? '',
            item.postal_code ?? '',
          ]
          if (!haystacks.some((value) => value.toLowerCase().includes(needle))) {
            return false
          }
        }
        return true
      }),
    [items, searchFilter, statusFilter],
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
    setForm({
      name: '',
      address_line: '',
      city: '',
      state: '',
      postal_code: '',
      is_active: true,
    })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      address_line: form.address_line.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postal_code: form.postal_code.trim(),
      is_active: form.is_active,
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/admin/locations/item?id=${editingId}`
      : `${apiBasePrefix}/api/admin/locations`

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save location.')
        setSaving(false)
        return
      }

      await loadLocations()
      resetForm()
    } catch {
      setError('Unable to save location.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/admin/locations/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load location.')
        return
      }

      const payload = (await response.json()) as { data: ManagedLocation }
      const item = payload.data
      setEditingId(item.id)
      setForm({
        name: item.name,
        address_line: item.address_line ?? '',
        city: item.city ?? '',
        state: item.state ?? '',
        postal_code: item.postal_code ?? '',
        is_active: Boolean(item.is_active),
      })
      setShowForm(true)
    } catch {
      setError('Unable to load location.')
    }
  }

  const deleteItem = async (id: number) => {
    const confirmed = window.confirm('Delete this location?')
    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/admin/locations/item?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete location.')
        return
      }

      await loadLocations()
    } catch {
      setError('Unable to delete location.')
    }
  }

  return !canAccess ? (
    <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
      <h3 className="text-xl font-semibold text-slate-900">Locations</h3>
      <p className="mt-2 text-sm text-slate-600">Only admin and manager users can access locations.</p>
    </section>
  ) : (
    <div className="space-y-5">
      <FormModal onClose={resetForm} open={showForm} title={editingId ? `Edit Location #${editingId}` : 'Create Location'}>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitForm}>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-2" onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Location name" required value={form.name} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-2" onChange={(event) => setForm((prev) => ({ ...prev, address_line: event.target.value }))} placeholder="Address line" value={form.address_line} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="City" value={form.city} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} placeholder="State / Province" value={form.state} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, postal_code: event.target.value }))} placeholder="Postal code" value={form.postal_code} />
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2.5 text-sm text-slate-700">
            <input checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} type="checkbox" />
            Active location
          </label>
          <div className="md:col-span-2">
            <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Update Location' : 'Create Location'}
            </button>
          </div>
        </form>
      </FormModal>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Locations</h3>
          <div className="flex items-center gap-2">
            <button className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800" onClick={() => { resetForm(); setShowForm(true) }} type="button">Create New</button>
            <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadLocations()} type="button">Refresh</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-b border-teal-100 px-4 py-3 md:grid-cols-3">
          <input className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring" onChange={(event) => setSearchFilter(event.target.value)} placeholder="Search name, city, or address" value={searchFilter} />
          <select className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring" onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')} value={statusFilter}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800 transition hover:bg-teal-50" onClick={() => { setSearchFilter(''); setStatusFilter('all') }} type="button">Clear Filters</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>Loading locations...</td></tr> : null}
              {!loading && filteredItems.length === 0 ? <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>No locations found.</td></tr> : null}
              {!loading ? pagedItems.map((item) => (
                <tr className="border-t border-slate-100" key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.city ?? '-'} {item.state ? `, ${item.state}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.address_line ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {item.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
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

export default LocationsPage
