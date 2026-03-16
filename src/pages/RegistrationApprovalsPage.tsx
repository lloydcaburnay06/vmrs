import { useEffect, useState } from 'react'
import { apiBasePrefix } from '../config'
import type { AuthUser, ManagedUser } from '../types'
import { formatDateTime } from '../utils/dateTime'

function RegistrationApprovalsPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadPendingRegistrations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/registrations`)

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load pending registrations.')
        return
      }

      const payload = (await response.json()) as { data: ManagedUser[] }
      setItems(payload.data)
    } catch {
      setError('Unable to connect to registration approval endpoint.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingRegistrations().catch(() => setLoading(false))
  }, [])

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setActingId(id)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/registrations/${action}?id=${id}`, {
        method: 'POST',
      })

      const body = (await response.json()) as { error?: string; message?: string }
      if (!response.ok) {
        setError(body.error ?? `Failed to ${action} registration.`)
        return
      }

      setMessage(body.message ?? `Registration ${action}d.`)
      await loadPendingRegistrations()
    } catch {
      setError(`Unable to ${action} registration.`)
    } finally {
      setActingId(null)
    }
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
        Only admin users can approve registrations.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Pending Registrations</h3>
            <p className="mt-1 text-xs text-slate-500">Approve new requester accounts before they can sign in.</p>
          </div>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
            onClick={() => loadPendingRegistrations()}
            type="button"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Employee No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    Loading pending registrations...
                  </td>
                </tr>
              ) : null}

              {!loading && items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No pending registrations found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? items.map((item) => (
                    <tr className="border-t border-slate-100" key={item.id}>
                      <td className="px-4 py-3 text-slate-700">{item.employee_no}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.first_name} {item.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.email}</td>
                      <td className="px-4 py-3 text-slate-700">{item.phone}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={actingId === item.id}
                            onClick={() => handleAction(item.id, 'approve')}
                            type="button"
                          >
                            {actingId === item.id ? 'Working...' : 'Approve'}
                          </button>
                          <button
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={actingId === item.id}
                            onClick={() => handleAction(item.id, 'reject')}
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

export default RegistrationApprovalsPage
