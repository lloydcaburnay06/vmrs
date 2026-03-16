import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, DriverWorkScheduleItem, VehicleOption } from '../types'
import { formatDate, formatTime, getCurrentMonthRange } from '../utils/dateTime'

function DriverWorkSchedulesPage({ currentUser }: { currentUser: AuthUser }) {
  const toLocalYmd = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [items, setItems] = useState<DriverWorkScheduleItem[]>([])
  const [drivers, setDrivers] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showWeeklyView, setShowWeeklyView] = useState(false)
  const [weeklyEditing, setWeeklyEditing] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [weeklyDraft, setWeeklyDraft] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().start)
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().end)
  const [form, setForm] = useState({
    driver_id: '',
    work_date: '',
    start_time: '08:00:00',
    end_time: '17:00:00',
    shift_type: 'regular',
    status: 'scheduled',
    notes: '',
  })

  const canManage = currentUser.role === 'admin' || currentUser.role === 'manager'

  const shiftCodeLabel = (code: DriverWorkScheduleItem['shift_code'] | 'UNSET' | null | undefined): string => {
    if (!code || code === 'UNSET') return '-'
    switch (code) {
      case 'S8_5':
        return '8-5'
      case 'S6_2':
        return '6-2'
      case 'S2_10':
        return '2-10'
      case 'S10_6':
        return '10-6'
      case 'OFF':
        return 'OFF'
      case 'H_OFF':
        return 'H-OFF'
      case 'CO':
        return 'CO'
      case 'LEAVE':
        return 'LEAVE'
      case 'OB':
        return 'OB'
      case 'OT':
        return 'OT'
      default:
        return '-'
    }
  }

  const scheduleCellCode = (item: DriverWorkScheduleItem): 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'OB' | 'OT' | 'UNSET' => {
    if (item.shift_code) {
      return item.shift_code
    }

    if (item.shift_type === 'off') return 'OFF'
    if (item.shift_type === 'leave') return 'LEAVE'
    if (!item.start_time || !item.end_time) return 'UNSET'
    if (item.start_time === '06:00:00' && item.end_time === '14:00:00') return 'S6_2'
    if (item.start_time === '08:00:00' && item.end_time === '17:00:00') return 'S8_5'
    if (item.start_time === '14:00:00' && item.end_time === '22:00:00') return 'S2_10'
    if (item.start_time === '22:00:00' && item.end_time === '06:00:00') return 'S10_6'
    return 'UNSET'
  }

  const weeklyContext = useMemo(() => {
    const parseLocalDate = (value: string): Date => {
      const parts = value.split('-').map(Number)
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    const toYmd = (date: Date): string => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    const baseDate = parseLocalDate(startDate)
    const daysBackToSunday = baseDate.getDay()
    const sunday = new Date(baseDate)
    sunday.setDate(baseDate.getDate() - daysBackToSunday)

    const weekDates: string[] = []
    for (let index = 0; index < 7; index++) {
      const day = new Date(sunday)
      day.setDate(sunday.getDate() + index)
      weekDates.push(toYmd(day))
    }

    const weekDateSet = new Set(weekDates)
    const assignmentByDriver = new Map<number, 'administrative' | 'ambulance'>(
      drivers.map((driver) => [driver.id, driver.assignment_type ?? 'ambulance']),
    )
    const rowsByDriver = new Map<number, {
      id: number
      name: string
      assignment: 'administrative' | 'ambulance'
      codes: Array<'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'OB' | 'OT' | 'UNSET'>
    }>()

    items.forEach((item) => {
      if (!weekDateSet.has(item.work_date)) {
        return
      }

      if (!rowsByDriver.has(item.driver_id)) {
        rowsByDriver.set(item.driver_id, {
          id: item.driver_id,
          name: item.driver_name,
          assignment: assignmentByDriver.get(item.driver_id) ?? 'ambulance',
          codes: Array(7).fill('UNSET') as Array<'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'OB' | 'OT' | 'UNSET'>,
        })
      }

      const dayIndex = weekDates.indexOf(item.work_date)
      if (dayIndex >= 0) {
        const row = rowsByDriver.get(item.driver_id)
        if (row) {
          row.codes[dayIndex] = scheduleCellCode(item)
        }
      }
    })

    const rows = Array.from(rowsByDriver.values()).sort((left, right) => left.name.localeCompare(right.name))

    return {
      weekDates,
      ambulanceRows: rows.filter((row) => row.assignment === 'ambulance'),
      administrativeRows: rows.filter((row) => row.assignment === 'administrative'),
    }
  }, [drivers, items, startDate])

  const pageSize = 10
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [currentPage, items])

  const loadData = async (rangeStartDate: string = startDate, rangeEndDate: string = endDate) => {
    setLoading(true)
    setError('')

    try {
      const [itemsRes, driversRes] = await Promise.all([
        fetch(`${apiBasePrefix}/api/driver-work-schedules?start_date=${rangeStartDate}&end_date=${rangeEndDate}`),
        fetch(`${apiBasePrefix}/api/travel-requests/driver-options`),
      ])

      if (!itemsRes.ok || !driversRes.ok) {
        const statusCode = !itemsRes.ok ? itemsRes.status : driversRes.status
        setError(statusCode === 403 ? 'Only manager/admin can manage driver work schedules.' : 'Failed to load work schedules.')
        setLoading(false)
        return
      }

      const itemsPayload = (await itemsRes.json()) as { data: DriverWorkScheduleItem[] }
      const driversPayload = (await driversRes.json()) as { data: VehicleOption[] }
      setItems(itemsPayload.data)
      setDrivers(driversPayload.data)
    } catch {
      setError('Unable to connect to driver work schedule endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(startDate, endDate).catch(() => setLoading(false))
  }, [startDate, endDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [items])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({
      driver_id: '',
      work_date: '',
      start_time: '08:00:00',
      end_time: '17:00:00',
      shift_type: 'regular',
      status: 'scheduled',
      notes: '',
    })
  }

  const generateSchedules = async () => {
    setGenerating(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/generate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to auto-generate schedules.')
        setGenerating(false)
        return
      }

      const body = (await response.json()) as { range?: { start_date: string; end_date: string } }
      const generatedStartDate = body.range?.start_date ?? startDate
      const generatedEndDate = body.range?.end_date ?? endDate
      setStartDate(generatedStartDate)
      setEndDate(generatedEndDate)
    } catch {
      setError('Unable to auto-generate schedules.')
    } finally {
      setGenerating(false)
    }
  }

  const shiftWeeklyView = async (direction: 'previous' | 'next') => {
    const parts = startDate.split('-').map(Number)
    const baseStart = new Date(parts[0], parts[1] - 1, parts[2])
    const movedStart = new Date(baseStart)
    movedStart.setDate(baseStart.getDate() + (direction === 'next' ? 7 : -7))
    const movedEnd = new Date(movedStart)
    movedEnd.setDate(movedStart.getDate() + 6)

    const nextStartDate = toLocalYmd(movedStart)
    const nextEndDate = toLocalYmd(movedEnd)
    setStartDate(nextStartDate)
    setEndDate(nextEndDate)
  }

  const beginWeeklyEdit = () => {
    setWeeklyDraft({})
    setWeeklyEditing(true)
  }

  const cancelWeeklyEdit = () => {
    setWeeklyDraft({})
    setWeeklyEditing(false)
  }

  const changeWeeklyCell = (driverId: number, workDate: string, shiftCode: string) => {
    const key = `${driverId}|${workDate}`
    setWeeklyDraft((prev) => ({ ...prev, [key]: shiftCode }))
  }

  const saveWeeklyGrid = async () => {
    setSavingWeekly(true)
    setError('')

    const rows = [...weeklyContext.ambulanceRows, ...weeklyContext.administrativeRows]
    const cells = rows.flatMap((row) =>
      weeklyContext.weekDates.map((workDate, index) => {
        const key = `${row.id}|${workDate}`
        const shiftCode = (weeklyDraft[key] ?? row.codes[index]) as string
        return {
          driver_id: row.id,
          work_date: workDate,
          shift_code: shiftCode,
        }
      }),
    )

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/upsert-weekly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_start: weeklyContext.weekDates[0],
          cells,
        }),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save weekly schedule changes.')
        setSavingWeekly(false)
        return
      }

      setWeeklyDraft({})
      setWeeklyEditing(false)
      await loadData(startDate, endDate)
    } catch {
      setError('Unable to save weekly schedule changes.')
    } finally {
      setSavingWeekly(false)
    }
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      driver_id: Number(form.driver_id),
      work_date: form.work_date,
      start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
      end_time: form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time,
      shift_type: form.shift_type,
      status: form.status,
      notes: form.notes.trim(),
    }

    const method = editingId ? 'PUT' : 'POST'
    const endpoint = editingId
      ? `${apiBasePrefix}/api/driver-work-schedules/item?id=${editingId}`
      : `${apiBasePrefix}/api/driver-work-schedules`

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save work schedule.')
        setSaving(false)
        return
      }

      await loadData()
      resetForm()
    } catch {
      setError('Unable to save work schedule.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load work schedule.')
        return
      }

      const payload = (await response.json()) as { data: DriverWorkScheduleItem }
      const item = payload.data
      setShowForm(true)
      setEditingId(item.id)
      setForm({
        driver_id: String(item.driver_id),
        work_date: item.work_date,
        start_time: item.start_time ?? '08:00:00',
        end_time: item.end_time ?? '17:00:00',
        shift_type: item.shift_type,
        status: item.status,
        notes: item.notes ?? '',
      })
    } catch {
      setError('Unable to load work schedule.')
    }
  }

  const deleteItem = async (id: number) => {
    const confirmed = window.confirm('Delete this work schedule?')
    if (!confirmed) return

    try {
      const response = await fetch(`${apiBasePrefix}/api/driver-work-schedules/item?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to delete work schedule.')
        return
      }

      await loadData()
      if (editingId === id) resetForm()
    } catch {
      setError('Unable to delete work schedule.')
    }
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Driver Work Schedules</h3>
        <p className="mt-2 text-sm text-slate-600">Only manager/admin can manage driver work schedules.</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <FormModal
        onClose={resetForm}
        open={showForm}
        title={editingId ? `Edit Work Schedule #${editingId}` : 'Create Driver Work Schedule'}
      >
        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={submitForm}>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, driver_id: event.target.value }))} required value={form.driver_id}>
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, work_date: event.target.value }))} required type="date" value={form.work_date} />
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, shift_type: event.target.value as 'regular' | 'overtime' | 'off' | 'leave' }))} value={form.shift_type}>
            <option value="regular">regular</option>
            <option value="overtime">overtime</option>
            <option value="off">off</option>
            <option value="leave">leave</option>
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))} required type="time" value={form.start_time.slice(0, 5)} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))} required type="time" value={form.end_time.slice(0, 5)} />
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'scheduled' | 'completed' | 'cancelled' }))} value={form.status}>
            <option value="scheduled">scheduled</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring md:col-span-3" onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes (optional)" value={form.notes} />
          <div className="md:col-span-3">
            <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Update Work Schedule' : 'Create Work Schedule'}
            </button>
          </div>
        </form>
      </FormModal>

      <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">Start Date</span>
            <input className="w-full border-0 bg-transparent p-0 text-xs outline-none" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring">
            <span className="whitespace-nowrap">End Date</span>
            <input className="w-full border-0 bg-transparent p-0 text-xs outline-none" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
          <button className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={generating} onClick={() => generateSchedules().catch(() => setError('Failed to auto-generate schedules.'))} type="button">
            {generating ? 'Generating...' : 'Auto Generate Next Week'}
          </button>
          <button className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50" onClick={() => setShowWeeklyView((prev) => !prev)} type="button">
            {showWeeklyView ? 'Hide Weekly View' : 'Weekly View'}
          </button>
          <button
            className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            onClick={() => {
              setEditingId(null)
              setForm({
                driver_id: '',
                work_date: '',
                start_time: '08:00:00',
                end_time: '17:00:00',
                shift_type: 'regular',
                status: 'scheduled',
                notes: '',
              })
              setShowForm(true)
            }}
            type="button"
          >
            Create New
          </button>
        </div>

        {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-500">Loading work schedules...</p> : null}

        {!loading && showWeeklyView ? (
          <div className="mb-4 overflow-x-auto rounded-xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Weekly Schedule {formatDate(weeklyContext.weekDates[0])} to {formatDate(weeklyContext.weekDates[6])}
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  onClick={() => shiftWeeklyView('previous').catch(() => setError('Failed to load previous week.'))}
                  disabled={weeklyEditing || savingWeekly}
                  type="button"
                >
                  Previous Week
                </button>
                <button
                  className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  onClick={() => shiftWeeklyView('next').catch(() => setError('Failed to load next week.'))}
                  disabled={weeklyEditing || savingWeekly}
                  type="button"
                >
                  Next Week
                </button>
                {!weeklyEditing ? (
                  <button
                    className="rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                    onClick={beginWeeklyEdit}
                    type="button"
                  >
                    Edit Weekly Grid
                  </button>
                ) : null}
                {weeklyEditing ? (
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={cancelWeeklyEdit}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
                {weeklyEditing ? (
                  <button
                    className="rounded-lg border border-teal-700 bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={savingWeekly}
                    onClick={() => saveWeeklyGrid().catch(() => setError('Failed to save weekly grid.'))}
                    type="button"
                  >
                    {savingWeekly ? 'Saving...' : 'Save Weekly Grid'}
                  </button>
                ) : null}
              </div>
            </div>
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="border border-amber-200 px-3 py-2">Driver</th>
                  <th className="border border-amber-200 px-3 py-2">Sun {weeklyContext.weekDates[0]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Mon {weeklyContext.weekDates[1]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Tue {weeklyContext.weekDates[2]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Wed {weeklyContext.weekDates[3]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Thu {weeklyContext.weekDates[4]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Fri {weeklyContext.weekDates[5]?.slice(8, 10)}</th>
                  <th className="border border-amber-200 px-3 py-2">Sat {weeklyContext.weekDates[6]?.slice(8, 10)}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-yellow-100">
                  <td className="border border-amber-200 px-3 py-2 font-semibold text-slate-900" colSpan={8}>Ambulance Drivers</td>
                </tr>
                {weeklyContext.ambulanceRows.map((row) => (
                  <tr key={`amb-${row.id}`}>
                    <td className="border border-amber-200 px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    {row.codes.map((code, index) => {
                      const workDate = weeklyContext.weekDates[index]
                      const key = `${row.id}|${workDate}`
                      const value = (weeklyDraft[key] ?? code) as 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'OB' | 'OT' | 'UNSET'
                      const cell = shiftCodeLabel(value)
                      const offLike = cell.includes('OFF') || cell === 'CO' || cell === 'LEAVE'
                      return (
                        <td className={`border border-amber-200 px-3 py-2 text-center font-semibold ${offLike ? 'bg-lime-100 text-slate-800' : 'text-slate-900'}`} key={`amb-${row.id}-${workDate}`}>
                          {weeklyEditing ? (
                            <select
                              className="w-full rounded border border-amber-300 bg-white px-1 py-1 text-xs"
                              onChange={(event) => changeWeeklyCell(row.id, workDate, event.target.value)}
                              value={value}
                            >
                              <option value="UNSET">-</option>
                              <option value="S8_5">8-5</option>
                              <option value="S6_2">6-2</option>
                              <option value="S2_10">2-10</option>
                              <option value="S10_6">10-6</option>
                              <option value="OFF">OFF</option>
                              <option value="H_OFF">H-OFF</option>
                              <option value="CO">CO</option>
                              <option value="LEAVE">LEAVE</option>
                              <option value="OB">OB</option>
                              <option value="OT">OT</option>
                            </select>
                          ) : (
                            cell
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="bg-yellow-100">
                  <td className="border border-amber-200 px-3 py-2 font-semibold text-slate-900" colSpan={8}>Administrative Drivers</td>
                </tr>
                {weeklyContext.administrativeRows.map((row) => (
                  <tr key={`adm-${row.id}`}>
                    <td className="border border-amber-200 px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    {row.codes.map((code, index) => {
                      const workDate = weeklyContext.weekDates[index]
                      const key = `${row.id}|${workDate}`
                      const value = (weeklyDraft[key] ?? code) as 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'OB' | 'OT' | 'UNSET'
                      const cell = shiftCodeLabel(value)
                      const offLike = cell.includes('OFF') || cell === 'CO' || cell === 'LEAVE'
                      return (
                        <td className={`border border-amber-200 px-3 py-2 text-center font-semibold ${offLike ? 'bg-lime-100 text-slate-800' : 'text-slate-900'}`} key={`adm-${row.id}-${workDate}`}>
                          {weeklyEditing ? (
                            <select
                              className="w-full rounded border border-amber-300 bg-white px-1 py-1 text-xs"
                              onChange={(event) => changeWeeklyCell(row.id, workDate, event.target.value)}
                              value={value}
                            >
                              <option value="UNSET">-</option>
                              <option value="S8_5">8-5</option>
                              <option value="S6_2">6-2</option>
                              <option value="S2_10">2-10</option>
                              <option value="S10_6">10-6</option>
                              <option value="OFF">OFF</option>
                              <option value="H_OFF">H-OFF</option>
                              <option value="CO">CO</option>
                              <option value="LEAVE">LEAVE</option>
                              <option value="OB">OB</option>
                              <option value="OT">OT</option>
                            </select>
                          ) : (
                            cell
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No work schedules in this range.</td></tr>
                ) : null}
                {pagedItems.map((item) => (
                  <tr className="border-t border-slate-100" key={item.id}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(item.work_date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.driver_name}</td>
                    <td className="px-4 py-3 text-slate-700">{item.start_time && item.end_time ? `${formatTime(item.start_time)} - ${formatTime(item.end_time)}` : '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{item.shift_code ? shiftCodeLabel(item.shift_code) : item.shift_type}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">{item.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(item.id).catch(() => setError('Failed to load schedule.'))} type="button">Edit</button>
                        <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => deleteItem(item.id).catch(() => setError('Failed to delete schedule.'))} type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              totalItems={items.length}
            />
          </div>
        ) : null}
      </article>
    </div>
  )
}


export default DriverWorkSchedulesPage

