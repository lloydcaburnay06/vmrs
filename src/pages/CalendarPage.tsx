import { useEffect, useMemo, useState } from 'react'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { CalendarTravelItem } from '../types'

function CalendarPage() {
  const [entries, setEntries] = useState<CalendarTravelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [detailPage, setDetailPage] = useState(1)
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${apiBasePrefix}/api/travel-requests/calendar`)

        if (!response.ok) {
          setError('Failed to load approved travel schedules.')
          setLoading(false)
          return
        }

        const payload = (await response.json()) as { data: CalendarTravelItem[] }
        setEntries(payload.data)
      } catch {
        setError('Unable to connect to calendar endpoint.')
      } finally {
        setLoading(false)
      }
    }

    loadCalendar().catch(() => setLoading(false))
  }, [])

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const firstWeekday = firstDayOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const gridSize = 42

  const monthLabel = monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const toDateKey = (value: Date) => {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const entryBuckets = useMemo(() => {
    const bucket = new Map<string, CalendarTravelItem[]>()

    for (const entry of entries) {
      const dateKey = entry.start_at.slice(0, 10)
      const list = bucket.get(dateKey) ?? []
      list.push(entry)
      bucket.set(dateKey, list)
    }

    return bucket
  }, [entries])

  const cells = Array.from({ length: gridSize }, (_, index) => {
    const dayNumber = index - firstWeekday + 1
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth
    const date = new Date(year, month, dayNumber)
    const dateKey = toDateKey(date)
    const dayEntries = inMonth ? entryBuckets.get(dateKey) ?? [] : []

    return {
      key: `${dateKey}-${index}`,
      dateKey,
      inMonth,
      dayNumber,
      dayEntries,
    }
  })
  const selectedEntries = selectedDateKey ? entryBuckets.get(selectedDateKey) ?? [] : []
  const detailPageSize = 6
  const pagedSelectedEntries = useMemo(() => {
    const start = (detailPage - 1) * detailPageSize
    return selectedEntries.slice(start, start + detailPageSize)
  }, [detailPage, selectedEntries])
  const selectedDateLabel = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    : ''

  useEffect(() => {
    setDetailPage(1)
  }, [selectedDateKey])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Approved Travel Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            type="button"
          >
            Prev
          </button>
          <span className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">{monthLabel}</span>
          <button
            className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-800"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <article className="rounded-2xl border border-teal-100 bg-white p-3 md:p-4">
        {loading ? <p className="px-2 py-4 text-sm text-slate-500">Loading calendar...</p> : null}

        {!loading ? (
          <div className="grid grid-cols-7 gap-2">
            {weekdayLabels.map((label) => (
              <div className="rounded-lg bg-teal-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600" key={label}>
                {label}
              </div>
            ))}

            {cells.map((cell) => (
              cell.inMonth ? (
                <button
                  className={`min-h-28 rounded-lg border p-2 text-left transition ${
                    selectedDateKey === cell.dateKey
                      ? 'border-teal-400 bg-teal-50'
                      : 'border-teal-100 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                  }`}
                  key={cell.key}
                  onClick={() => setSelectedDateKey(cell.dateKey)}
                  type="button"
                >
                  <p className="mb-1 text-xs font-semibold text-slate-700">{cell.dayNumber}</p>
                  <div className="space-y-1">
                    {cell.dayEntries.slice(0, 3).map((entry) => (
                      <div className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800" key={entry.id}>
                        {entry.vehicle_code}: {entry.purpose}
                      </div>
                    ))}
                    {cell.dayEntries.length > 3 ? (
                      <p className="text-[11px] font-medium text-slate-500">+{cell.dayEntries.length - 3} more</p>
                    ) : null}
                  </div>
                </button>
              ) : (
                <div className="min-h-28 rounded-lg border border-slate-100 bg-slate-50 p-2 text-slate-400" key={cell.key} />
              )
            ))}
          </div>
        ) : null}

      </article>

      {!loading && selectedDateKey ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setSelectedDateKey(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-teal-100 bg-white p-4 md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h4 className="text-sm font-semibold text-slate-900">Schedule Details: {selectedDateLabel}</h4>
              <button
                className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                onClick={() => setSelectedDateKey(null)}
                type="button"
              >
                Close
              </button>
            </div>

            {selectedEntries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No schedules for this date.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {pagedSelectedEntries.map((entry) => (
                  <div className="rounded-lg border border-teal-100 bg-white p-2" key={`detail-${entry.id}`}>
                    <p className="text-sm font-semibold text-slate-900">{entry.vehicle_code} ({entry.vehicle_name})</p>
                    <p className="text-xs text-slate-700">{entry.start_at} to {entry.end_at}</p>
                    <p className="text-xs text-slate-700">Purpose: {entry.purpose}</p>
                    <p className="text-xs text-slate-700">Requester: {entry.requester_name}</p>
                    <p className="text-xs text-slate-700">Driver: {entry.driver_name ?? '-'}</p>
                    <p className="text-xs text-slate-700">Pickup: {entry.pickup_location_name ?? '-'}</p>
                    <p className="text-xs text-slate-700">Dropoff: {entry.dropoff_location_name ?? '-'}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Pagination
                currentPage={detailPage}
                onPageChange={setDetailPage}
                pageSize={detailPageSize}
                totalItems={selectedEntries.length}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


export default CalendarPage

