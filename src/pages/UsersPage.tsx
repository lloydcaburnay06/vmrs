import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import PasswordField from '../components/PasswordField'
import { apiBasePrefix } from '../config'
import type { AuthUser, ManagedUser, RoleOption, UserStatus } from '../types'

function UsersPage({ currentUser }: { currentUser: AuthUser }) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    role_id: '',
    employee_no: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
    password: '',
  })

  const loadUsersData = async () => {
    setLoading(true)
    setError('')

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch(`${apiBasePrefix}/api/users`),
        fetch(`${apiBasePrefix}/api/roles`),
      ])

      if (!usersResponse.ok || !rolesResponse.ok) {
        const statusCode = !usersResponse.ok ? usersResponse.status : rolesResponse.status
        setError(
          statusCode === 403
            ? 'Only admin users can access user management.'
            : 'Failed to load users and roles.',
        )
        setLoading(false)
        return
      }

      const usersPayload = (await usersResponse.json()) as { data: ManagedUser[] }
      const rolesPayload = (await rolesResponse.json()) as { data: RoleOption[] }

      setUsers(usersPayload.data)
      setRoles(rolesPayload.data)
    } catch {
      setError('Unable to connect to user management endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsersData().catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [users])

  const pageSize = 10
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return users.slice(start, start + pageSize)
  }, [currentPage, users])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({
      role_id: '',
      employee_no: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'active',
      password: '',
    })
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      role_id: Number(form.role_id),
      employee_no: form.employee_no.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      password: form.password,
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/users/item?id=${editingId}`
      : `${apiBasePrefix}/api/users`

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
        setError(body.error ?? 'Failed to save user.')
        setSaving(false)
        return
      }

      await loadUsersData()
      resetForm()
    } catch {
      setError('Unable to save user.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/users/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load user.')
        return
      }

      const payload = (await response.json()) as { data: ManagedUser }
      const user = payload.data
      setShowForm(true)
      setEditingId(user.id)
      setForm({
        role_id: String(user.role_id),
        employee_no: user.employee_no ?? '',
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone ?? '',
        status: user.status,
        password: '',
      })
    } catch {
      setError('Unable to load user.')
    }
  }

  const deleteUser = async (id: number) => {
    const confirmed = window.confirm('Delete this user account?')

    if (!confirmed) {
      return
    }

    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/users/item?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete user.')
        return
      }

      await loadUsersData()
      if (editingId === id) {
        resetForm()
      }
    } catch {
      setError('Unable to delete user.')
    }
  }

  return (
    <div className="space-y-5">
      <FormModal onClose={resetForm} open={showForm} title={editingId ? `Edit User #${editingId}` : 'Create User'}>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitForm}>
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            placeholder="First name"
            required
            value={form.first_name}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            placeholder="Last name"
            required
            value={form.last_name}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            required
            type="email"
            value={form.email}
          />
          <PasswordField
            inputClassName="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            minLength={editingId ? 0 : 8}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder={editingId ? 'New password (optional)' : 'Password (min 8 chars)'}
            required={!editingId}
            value={form.password}
          />
          <select
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, role_id: event.target.value }))}
            required
            value={form.role_id}
          >
            <option value="">Select role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as UserStatus }))}
            value={form.status}
          >
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </select>
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, employee_no: event.target.value }))}
            placeholder="Employee no (optional)"
            value={form.employee_no}
          />
          <input
            className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone (optional)"
            value={form.phone}
          />
          <div className="md:col-span-2">
            <button
              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </FormModal>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">User Accounts</h3>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
              onClick={() => {
                setEditingId(null)
                setForm({
                  role_id: '',
                  employee_no: '',
                  first_name: '',
                  last_name: '',
                  email: '',
                  phone: '',
                  status: 'active',
                  password: '',
                })
                setShowForm(true)
              }}
              type="button"
            >
              Create New
            </button>
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
              onClick={() => loadUsersData()}
              type="button"
            >
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
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    Loading users...
                  </td>
                </tr>
              ) : null}

              {!loading && users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? pagedUsers.map((managedUser) => (
                    <tr className="border-t border-slate-100" key={managedUser.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {managedUser.first_name} {managedUser.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{managedUser.email}</td>
                      <td className="px-4 py-3 text-slate-700">{managedUser.role_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">
                          {managedUser.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                            onClick={() => startEdit(managedUser.id)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={managedUser.id === currentUser.id}
                            onClick={() => deleteUser(managedUser.id)}
                            type="button"
                          >
                            Delete
                          </button>
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
            totalItems={users.length}
          />
        ) : null}
      </article>
    </div>
  )
}


export default UsersPage

