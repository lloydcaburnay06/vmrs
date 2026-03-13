import { useEffect, useMemo, useState } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuditLogItem, AuthUser } from '../types'

function AuditLogsPage({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)
  const canAccess = currentUser.role === 'admin' || currentUser.role === 'manager'

  const loadAuditLogs = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (actionFilter !== '') {
        params.set('action', actionFilter)
      }
      if (entityFilter !== '') {
        params.set('entity_type', entityFilter)
      }
      if (searchFilter.trim() !== '') {
        params.set('search', searchFilter.trim())
      }

      const suffix = params.toString() !== '' ? `?${params.toString()}` : ''
      const response = await fetch(`${apiBasePrefix}/api/audit-logs${suffix}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load audit logs.')
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { data: AuditLogItem[] }
      setItems(payload.data)
    } catch {
      setError('Unable to connect to audit log endpoint.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return
    }

    loadAuditLogs().catch(() => setLoading(false))
  }, [canAccess, actionFilter, entityFilter])

  const actionOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.action))).sort((left, right) => left.localeCompare(right)),
    [items],
  )
  const entityOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.entity_type))).sort((left, right) => left.localeCompare(right)),
    [items],
  )

  const filteredItems = useMemo(() => {
    if (searchFilter.trim() === '') {
      return items
    }

    const needle = searchFilter.trim().toLowerCase()
    return items.filter((item) =>
      [
        item.action,
        item.entity_type,
        item.user_name ?? '',
        item.user_email ?? '',
        String(item.entity_id ?? ''),
        item.payload ?? '',
      ].some((value) => value.toLowerCase().includes(needle)),
    )
  }, [items, searchFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredItems, actionFilter, entityFilter, searchFilter])

  const pageSize = 12
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [currentPage, filteredItems])

  const openLog = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/audit-logs/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load audit log details.')
        return
      }

      const payload = (await response.json()) as { data: AuditLogItem }
      setSelectedLog(payload.data)
    } catch {
      setError('Unable to load audit log details.')
    }
  }

  const payloadPreview = (value: string | null) => {
    if (!value) {
      return 'No payload'
    }

    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  if (!canAccess) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Audit Logs</h3>
        <p className="mt-2 text-sm text-slate-600">Only admin and manager users can access audit logs.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <FormModal
        maxWidthClass="max-w-4xl"
        onClose={() => setSelectedLog(null)}
        open={selectedLog !== null}
        title={selectedLog ? `Audit Log #${selectedLog.id}` : 'Audit Log'}
      >
        {selectedLog ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-700">Action:</span> {selectedLog.action}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Entity:</span> {selectedLog.entity_type}
                {selectedLog.entity_id !== null ? ` #${selectedLog.entity_id}` : ''}
              </p>
              <p>
                <span className="font-semibold text-slate-700">User:</span> {selectedLog.user_name ?? 'System'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Email:</span> {selectedLog.user_email ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">IP:</span> {selectedLog.ip_address ?? '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Created:</span> {selectedLog.created_at}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Payload</p>
              <pre className="max-h-[380px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                {payloadPreview(selectedLog.payload)}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">User Agent</p>
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {selectedLog.user_agent ?? 'No user agent recorded'}
              </p>
            </div>
          </div>
        ) : null}
      </FormModal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-700">Log Entries</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-900">{filteredItems.length}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Actions</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{actionOptions.length}</p>
        </article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Entities</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">{entityOptions.length}</p>
        </article>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Activity History</h3>
            <p className="mt-1 text-xs text-slate-500">System actions recorded from admin and operations workflows</p>
          </div>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800"
            onClick={() => loadAuditLogs()}
            type="button"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-teal-100 px-4 py-3 md:grid-cols-4">
          <input
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search action, user, entity, or payload"
            value={searchFilter}
          />
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setActionFilter(event.target.value)}
            value={actionFilter}
          >
            <option value="">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setEntityFilter(event.target.value)}
            value={entityFilter}
          >
            <option value="">All entities</option>
            {entityOptions.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800 transition hover:bg-teal-50"
            onClick={() => {
              setSearchFilter('')
              setActionFilter('')
              setEntityFilter('')
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
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    Loading audit logs...
                  </td>
                </tr>
              ) : null}

              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No audit logs found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? pagedItems.map((item) => (
                    <tr className="border-t border-slate-100" key={item.id}>
                      <td className="px-4 py-3 text-slate-700">{item.created_at}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">
                          {item.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{item.user_name ?? 'System'}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.user_email ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.entity_type}
                        {item.entity_id !== null ? ` #${item.entity_id}` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.ip_address ?? '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                          onClick={() => openLog(item.id)}
                          type="button"
                        >
                          View
                        </button>
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

export default AuditLogsPage
