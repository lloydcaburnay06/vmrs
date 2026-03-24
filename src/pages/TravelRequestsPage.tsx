import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import FormModal from '../components/FormModal'
import Pagination from '../components/Pagination'
import { apiBasePrefix } from '../config'
import type { AuthUser, ManagedVehicle, TravelRequestItem, VehicleOption } from '../types'
import { formatDate, formatDateRange, formatDateTime } from '../utils/dateTime'
import brandLogo from '../assets/brand-logo-ui.png'

const createEmptyRequestForm = () => ({
  vehicle_id: '',
  pickup_location_id: '',
  dropoff_location_id: '',
  purpose: '',
  destination: '',
  start_at: '',
  end_at: '',
  passengers: '',
  passenger_names: [] as string[],
  priority: 'normal',
  remarks: '',
})

const buildVehicleGroups = (vehicleList: ManagedVehicle[]) => {
  const serviceTypeLabels: Record<ManagedVehicle['service_type'], string> = {
    ambulance: 'Ambulance',
    administrative: 'Administrative',
  }

  return (['ambulance', 'administrative'] as const)
    .map((serviceType) => ({
      serviceType,
      label: serviceTypeLabels[serviceType],
      items: vehicleList
        .filter((vehicle) => vehicle.service_type === serviceType)
        .sort((left, right) => {
          const leftLabel = `${left.vehicle_code} ${left.make} ${left.model}`.trim()
          const rightLabel = `${right.vehicle_code} ${right.make} ${right.model}`.trim()
          return leftLabel.localeCompare(rightLabel)
        }),
    }))
    .filter((group) => group.items.length > 0)
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

function TravelRequestsPage({ currentUser }: { currentUser: AuthUser }) {
  const [requests, setRequests] = useState<TravelRequestItem[]>([])
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([])
  const [availableVehicles, setAvailableVehicles] = useState<ManagedVehicle[]>([])
  const [locations, setLocations] = useState<VehicleOption[]>([])
  const [drivers, setDrivers] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableVehiclesLoading, setAvailableVehiclesLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableVehiclesError, setAvailableVehiclesError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelApprovedReason, setCancelApprovedReason] = useState('')
  const [approvalVehicleId, setApprovalVehicleId] = useState('')
  const [approvalDriverId, setApprovalDriverId] = useState('')
  const [approvalAvailableVehicles, setApprovalAvailableVehicles] = useState<ManagedVehicle[]>([])
  const [approvalAvailableVehiclesLoading, setApprovalAvailableVehiclesLoading] = useState(false)
  const [approvalAvailableVehiclesError, setApprovalAvailableVehiclesError] = useState('')
  const [statusTab, setStatusTab] = useState<'all' | TravelRequestItem['status']>('all')
  const [filterRequesterId, setFilterRequesterId] = useState('')
  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [filterTravelDate, setFilterTravelDate] = useState('')
  const [filterDriverId, setFilterDriverId] = useState('')
  const [filterReference, setFilterReference] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showRequesterForm, setShowRequesterForm] = useState(false)
  const [form, setForm] = useState(createEmptyRequestForm)
  const passengerCount = useMemo(() => {
    const parsed = Number.parseInt(form.passengers, 10)
    return Number.isNaN(parsed) || parsed < 1 ? 0 : parsed
  }, [form.passengers])

  const isRequester = currentUser.role === 'requester'
  const isAdmin = currentUser.role === 'admin'
  const isCao = currentUser.role === 'cao'
  const selectedRequest = selectedRequestId !== null
    ? requests.find((item) => item.id === selectedRequestId) ?? null
    : null
  const statusTabs: Array<{ key: 'all' | TravelRequestItem['status']; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'no_show', label: 'No Show' },
  ]
  const requesterOptions = useMemo(
    () =>
      Array.from(
        new Map(
          requests.map((item) => [item.requester_id, item.requester_name]),
        ).entries(),
      )
        .map(([id, name]) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [requests],
  )

  const driverOptions = useMemo(
    () =>
      Array.from(
        new Map(
          requests
            .filter((item) => item.assigned_driver_id !== null && item.driver_name)
            .map((item) => [item.assigned_driver_id as number, item.driver_name as string]),
        ).entries(),
      )
        .map(([id, name]) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [requests],
  )

  const groupedVehicles = useMemo(
    () => buildVehicleGroups(vehicles),
    [vehicles],
  )
  const availableVehicleGroups = useMemo(
    () => buildVehicleGroups(availableVehicles),
    [availableVehicles],
  )
  const approvalAvailableVehicleGroups = useMemo(
    () => buildVehicleGroups(approvalAvailableVehicles),
    [approvalAvailableVehicles],
  )

  const filteredRequests = useMemo(
    () =>
      requests.filter((item) => {
        if (statusTab !== 'all' && item.status !== statusTab) {
          return false
        }
        if (filterRequesterId !== '' && item.requester_id !== Number(filterRequesterId)) {
          return false
        }
        if (filterVehicleId !== '' && item.vehicle_id !== Number(filterVehicleId)) {
          return false
        }
        if (filterDriverId !== '' && item.assigned_driver_id !== Number(filterDriverId)) {
          return false
        }
        if (filterTravelDate !== '' && item.start_at.slice(0, 10) !== filterTravelDate) {
          return false
        }
        if (
          filterReference.trim() !== '' &&
          !item.reservation_no.toLowerCase().includes(filterReference.trim().toLowerCase())
        ) {
          return false
        }

        return true
      }),
    [filterDriverId, filterReference, filterRequesterId, filterTravelDate, filterVehicleId, requests, statusTab],
  )
  const pageSize = 10
  const pagedFilteredRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRequests.slice(start, start + pageSize)
  }, [currentPage, filteredRequests])
  const requestStatusBadgeClass = (status: TravelRequestItem['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-slate-200 text-slate-700'
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'active':
        return 'bg-sky-100 text-sky-800'
      case 'completed':
        return 'bg-teal-100 text-teal-800'
      case 'no_show':
        return 'bg-rose-100 text-rose-800'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }
  const getCancellationReason = (item: TravelRequestItem) => {
    const explicitReason = item.rejection_reason?.trim()
    if (explicitReason) {
      return explicitReason
    }

    const fallbackRemark = item.remarks?.trim()
    if (fallbackRemark) {
      return fallbackRemark
    }

    return 'No cancellation reason provided.'
  }
  const getRejectionReason = (item: TravelRequestItem) => {
    const explicitReason = item.rejection_reason?.trim()
    if (explicitReason) {
      return explicitReason
    }

    return 'No rejection reason provided.'
  }
  const printTravelRequest = (item: TravelRequestItem) => {
    const printWindow = window.open('', '_blank', 'width=1100,height=900')

    if (!printWindow) {
      setError('Unable to open print preview. Please allow pop-ups and try again.')
      return
    }

    const logoUrl = new URL(brandLogo, window.location.origin).href
    const destinationText = item.destination?.trim() || item.dropoff_location_name?.trim() || ''
    const requestedDateText = formatDate(item.created_at)
    const travelDateTimeText = `${formatDateTime(item.start_at)} to ${formatDateTime(item.end_at)}`
    const vehicleDisplay = `${item.vehicle_name} ${item.plate_no ? `(${item.plate_no})` : ''}`.trim()
    const assignedDriver = item.driver_name?.trim() || ''
    const approvedBy = item.approver_name?.trim() || ''
    const requestedBy = item.requester_name.trim()
    const printableHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Request for Travel Conduction - ${escapeHtml(item.reservation_no)}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #f5f5f5;
        color: #111;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #fff;
        border: 1px solid #c9c9c9;
        position: relative;
        padding: 18px 22px 20px;
      }
      .page::after {
        content: '';
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 6px;
        border-bottom: 2px dotted #222;
      }
      .header {
        display: grid;
        grid-template-columns: 230px 1fr 190px;
        align-items: start;
        gap: 12px;
      }
      .header-left {
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      .seal {
        width: 94px;
        height: 94px;
        object-fit: contain;
      }
      .header-center {
        text-align: center;
        line-height: 1.05;
      }
      .header-center .line-1 {
        font-size: 27px;
      }
      .header-center .line-2 {
        font-size: 25px;
      }
      .header-center .line-3 {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0.4px;
      }
      .header-center .line-4 {
        font-size: 22px;
      }
      .header-right {
        text-align: center;
        padding-top: 2px;
      }
      .bagong-mark {
        width: 88px;
        height: 88px;
        margin: 0 auto 4px;
        border-radius: 50%;
        background:
          radial-gradient(circle at 50% 42%, #ffd54a 0 22%, transparent 23%),
          conic-gradient(from 210deg, #1437c8 0 70deg, #ffffff 70deg 100deg, #f2c318 100deg 140deg, #ffffff 140deg 160deg, #cc1414 160deg 300deg, #1437c8 300deg 360deg);
        position: relative;
        overflow: hidden;
      }
      .bagong-mark::after {
        content: '';
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 14px;
        height: 28px;
        background: #ffffff;
        border-radius: 0 0 60px 60px;
      }
      .bagong-label {
        font-size: 18px;
        font-style: italic;
        font-weight: 700;
        color: #1e40af;
      }
      .title {
        margin-top: 26px;
        text-align: center;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 0.5px;
      }
      .fields {
        margin-top: 28px;
        font-size: 18px;
      }
      .field-row {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        margin-bottom: 6px;
      }
      .field-label {
        min-width: 165px;
      }
      .field-sep {
        width: 14px;
        text-align: center;
      }
      .line {
        flex: 1;
        min-height: 25px;
        border-bottom: 2px solid #222;
        padding: 0 8px 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .line.short {
        flex: 0 0 160px;
      }
      .line.medium {
        flex: 0 0 380px;
      }
      .line.long {
        flex: 0 0 720px;
      }
      .line.block {
        min-height: 34px;
      }
      .spacer {
        height: 18px;
      }
      .approval-row {
        display: grid;
        grid-template-columns: 1fr 1.3fr;
        gap: 26px;
        margin-top: 36px;
        align-items: start;
      }
      .signature-area {
        padding-top: 66px;
      }
      .signature-label {
        font-size: 18px;
      }
      .signature-line {
        margin-top: 58px;
        width: 300px;
        border-bottom: 2px solid #222;
      }
      .signature-caption {
        width: 300px;
        text-align: center;
        font-size: 15px;
        margin-top: 4px;
      }
      .fill-note {
        margin-top: 34px;
        font-size: 16px;
        font-style: italic;
        font-weight: 700;
        text-align: center;
      }
      .approval-box {
        border: 2px dashed #555;
        padding: 14px 18px 12px;
        min-height: 210px;
      }
      .approval-box-title {
        text-align: center;
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 28px;
      }
      .approval-box .vehicle-row {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        justify-content: center;
      }
      .approval-box .vehicle-label {
        font-size: 18px;
      }
      .approval-box .vehicle-line {
        width: 300px;
        border-bottom: 1px solid #222;
        min-height: 24px;
        text-align: center;
        padding-bottom: 2px;
        font-size: 16px;
      }
      .approval-box .vehicle-caption {
        text-align: center;
        font-size: 13px;
        font-style: italic;
        margin-top: 2px;
      }
      .approval-signatory {
        margin-top: 62px;
        text-align: center;
      }
      .approval-signatory .name {
        font-size: 19px;
        font-weight: 800;
        text-decoration: underline;
      }
      .approval-signatory .role {
        font-size: 18px;
        margin-top: 2px;
      }
      .footer-approvals {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 50px;
        margin-top: 28px;
      }
      .footer-label {
        font-size: 19px;
      }
      .footer-line-wrap {
        display: flex;
        align-items: flex-end;
        gap: 10px;
      }
      .footer-line {
        flex: 1;
        border-bottom: 2px solid #222;
        min-height: 23px;
        padding-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .footer-caption {
        text-align: center;
        font-size: 14px;
        margin-top: 2px;
      }
      .doc-footer {
        display: grid;
        grid-template-columns: 1fr 1fr 1.4fr;
        gap: 16px;
        margin-top: 46px;
        font-size: 14px;
      }
      .print-controls {
        width: 210mm;
        margin: 14px auto 12px;
        display: flex;
        justify-content: flex-end;
      }
      .print-button {
        border: 1px solid #0f766e;
        background: #0f766e;
        color: #fff;
        border-radius: 8px;
        padding: 10px 18px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
      @media print {
        body {
          background: #fff;
        }
        .print-controls {
          display: none;
        }
        .page {
          border: none;
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-controls">
      <button class="print-button" onclick="window.print()">Print</button>
    </div>
    <div class="page">
      <div class="header">
        <div class="header-left">
          <img class="seal" src="${logoUrl}" alt="MRH seal" />
          <img class="seal" src="${logoUrl}" alt="MRH seal duplicate" />
        </div>
        <div class="header-center">
          <div class="line-1">Republic of the Philippines</div>
          <div class="line-2">Department of Health</div>
          <div class="line-3">MARGOSATUBIG REGIONAL HOSPITAL</div>
          <div class="line-4">Margosatubig, Zamboanga del Sur</div>
        </div>
        <div class="header-right">
          <div class="bagong-mark"></div>
          <div class="bagong-label">BAGONG PILIPINAS</div>
        </div>
      </div>

      <div class="title">REQUEST FOR TRAVEL CONDUCTION</div>

      <div class="fields">
        <div class="field-row">
          <div class="field-label">Date of Request:</div>
          <div class="line short">${escapeHtml(requestedDateText)}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Requesting Unit/Office:</div>
          <div class="line medium"></div>
        </div>
        <div class="field-row">
          <div class="field-label">Destination</div>
          <div class="field-sep">:</div>
          <div class="line">${escapeHtml(destinationText)}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Purpose</div>
          <div class="field-sep">:</div>
          <div class="line">${escapeHtml(item.purpose)}</div>
        </div>
        <div class="field-row">
          <div class="field-label"></div>
          <div class="field-sep"></div>
          <div class="line block"></div>
        </div>

        <div class="spacer"></div>

        <div class="field-row">
          <div class="field-label">Date/Time of Intended Travel:</div>
          <div class="line medium">${escapeHtml(travelDateTimeText)}</div>
        </div>
      </div>

      <div class="approval-row">
        <div class="signature-area">
          <div class="signature-label">Requested by:</div>
          <div class="signature-line">${escapeHtml(requestedBy)}</div>
          <div class="signature-caption">Signature over Printed Name</div>
          <div class="fill-note">-------------------------------This portion is to be filled out by HFMS ---</div>
        </div>

        <div class="approval-box">
          <div class="approval-box-title">APPROVAL FOR VEHICLE USE</div>
          <div class="vehicle-row">
            <div class="vehicle-label">Vehicle:</div>
            <div class="vehicle-line">${escapeHtml(vehicleDisplay)}</div>
          </div>
          <div class="vehicle-caption">(Vehicle Model and Plate Number)</div>

          <div class="approval-signatory">
            <div class="name">EUGENE A. DAGOLDOL, RN,MN,MBA</div>
            <div class="role">Chief Administrative Officer</div>
          </div>
        </div>
      </div>

      <div class="footer-approvals">
        <div>
          <div class="footer-line-wrap">
            <div class="footer-label">Assigned Driver:</div>
            <div class="footer-line">${escapeHtml(assignedDriver)}</div>
          </div>
          <div class="footer-caption">Name</div>
        </div>
        <div>
          <div class="footer-line-wrap">
            <div class="footer-label">Approved by:</div>
            <div class="footer-line">${escapeHtml(approvedBy)}</div>
          </div>
          <div class="footer-caption">Motorpool Supervisor</div>
        </div>
      </div>

      <div class="doc-footer">
        <div>FM-HFMS-MP-001</div>
        <div>REVISION: 04</div>
        <div>EFFECTIVITY DATE: April 5, 2024</div>
      </div>
    </div>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () { window.print(); }, 250);
      });
    </script>
  </body>
</html>`

    printWindow.document.open()
    printWindow.document.write(printableHtml)
    printWindow.document.close()
  }

  const toSqlDateTime = (value: string): string => value.replace('T', ' ') + ':00'
  const fromSqlDateTime = (value: string): string => value.slice(0, 16).replace(' ', 'T')
  const hasTravelWindow = form.start_at !== '' && form.end_at !== ''
  const hasValidTravelWindow = hasTravelWindow && new Date(form.end_at).getTime() > new Date(form.start_at).getTime()
  const vehicleSelectPlaceholder = !hasTravelWindow
    ? 'Select start and end time first'
    : !hasValidTravelWindow
      ? 'End time must be later than start time'
      : availableVehiclesLoading
        ? 'Loading available vehicles...'
        : availableVehiclesError !== ''
          ? 'Unable to load available vehicles'
          : availableVehicleGroups.length === 0
            ? 'No vehicles available for this schedule'
            : 'Select vehicle'
  const vehicleAvailabilityHint = availableVehiclesError !== ''
    ? availableVehiclesError
    : !hasTravelWindow
      ? 'Choose the travel date and time first to filter the vehicle list.'
      : !hasValidTravelWindow
        ? 'Set an end time later than the start time to load available vehicles.'
        : availableVehiclesLoading
          ? 'Checking vehicle availability for the selected travel window.'
        : availableVehicleGroups.length === 0
          ? 'No active vehicle is available for the selected travel window.'
          : `${availableVehicles.length} vehicle${availableVehicles.length === 1 ? '' : 's'} available for the selected travel window.`
  const approvalVehiclePlaceholder = approvalAvailableVehiclesLoading
    ? 'Loading available vehicles...'
    : approvalAvailableVehiclesError !== ''
      ? 'Unable to load available vehicles'
      : approvalAvailableVehicleGroups.length === 0
        ? 'No vehicles available for this request'
        : 'Assigned vehicle'
  const approvalVehicleHint = approvalAvailableVehiclesError !== ''
    ? approvalAvailableVehiclesError
    : approvalAvailableVehiclesLoading
      ? 'Checking vehicle availability for the requested travel window.'
      : approvalAvailableVehicleGroups.length === 0
        ? 'No active vehicle is available for the requested travel window.'
        : `${approvalAvailableVehicles.length} vehicle${approvalAvailableVehicles.length === 1 ? '' : 's'} available for this request.`

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const requestsPromise = fetch(`${apiBasePrefix}/api/travel-requests`)
      const vehiclesPromise = fetch(`${apiBasePrefix}/api/vehicles`)
      const locationsPromise = fetch(`${apiBasePrefix}/api/locations`)
      const driversPromise = isAdmin
        ? fetch(`${apiBasePrefix}/api/travel-requests/driver-options`)
        : Promise.resolve(null)

      const [requestsRes, vehiclesRes, locationsRes, driversRes] = await Promise.all([
        requestsPromise,
        vehiclesPromise,
        locationsPromise,
        driversPromise,
      ])

      if (!requestsRes.ok || !vehiclesRes.ok || !locationsRes.ok) {
        setError('Failed to load travel request data.')
        setLoading(false)
        return
      }

      const requestsPayload = (await requestsRes.json()) as { data: TravelRequestItem[] }
      const vehiclesPayload = (await vehiclesRes.json()) as { data: ManagedVehicle[] }
      const locationsPayload = (await locationsRes.json()) as { data: VehicleOption[] }

      setRequests(requestsPayload.data)
      setVehicles(vehiclesPayload.data)
      setLocations(locationsPayload.data)

      if (driversRes && driversRes.ok) {
        const driversPayload = (await driversRes.json()) as { data: VehicleOption[] }
        setDrivers(driversPayload.data)
      }
    } catch {
      setError('Unable to connect to travel request endpoints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusTab, filterRequesterId, filterVehicleId, filterTravelDate, filterDriverId, filterReference, requests])

  const resetForm = () => {
    setEditingId(null)
    setShowRequesterForm(false)
    setAvailableVehicles([])
    setAvailableVehiclesError('')
    setAvailableVehiclesLoading(false)
    setForm(createEmptyRequestForm())
  }

  useEffect(() => {
    setForm((prev) => {
      if (prev.passenger_names.length === passengerCount) {
        return prev
      }

      return {
        ...prev,
        passenger_names: Array.from({ length: passengerCount }, (_, index) => prev.passenger_names[index] ?? ''),
      }
    })
  }, [passengerCount])

  useEffect(() => {
    if (!showRequesterForm) {
      return
    }

    if (!hasTravelWindow || !hasValidTravelWindow) {
      setAvailableVehicles([])
      setAvailableVehiclesError('')
      setAvailableVehiclesLoading(false)
      return
    }

    const controller = new AbortController()

    const loadAvailableVehicles = async () => {
      setAvailableVehiclesLoading(true)
      setAvailableVehiclesError('')

      try {
        const params = new URLSearchParams({
          start_at: toSqlDateTime(form.start_at),
          end_at: toSqlDateTime(form.end_at),
        })

        if (editingId !== null) {
          params.set('exclude_request_id', String(editingId))
        }

        const response = await fetch(`${apiBasePrefix}/api/travel-requests/available-vehicles?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          const body = (await response.json()) as { error?: string }
          setAvailableVehicles([])
          setAvailableVehiclesError(body.error ?? 'Failed to load available vehicles.')
          return
        }

        const payload = (await response.json()) as { data: ManagedVehicle[] }
        setAvailableVehicles(payload.data)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setAvailableVehicles([])
        setAvailableVehiclesError('Unable to load available vehicles.')
      } finally {
        if (!controller.signal.aborted) {
          setAvailableVehiclesLoading(false)
        }
      }
    }

    loadAvailableVehicles().catch(() => {
      setAvailableVehicles([])
      setAvailableVehiclesError('Unable to load available vehicles.')
      setAvailableVehiclesLoading(false)
    })

    return () => controller.abort()
  }, [editingId, form.end_at, form.start_at, hasTravelWindow, hasValidTravelWindow, showRequesterForm])

  useEffect(() => {
    if (!showRequesterForm || form.vehicle_id === '') {
      return
    }

    if (!hasTravelWindow || !hasValidTravelWindow) {
      setForm((prev) => ({ ...prev, vehicle_id: '' }))
      return
    }

    if (availableVehiclesLoading || availableVehiclesError !== '') {
      return
    }

    const isStillAvailable = availableVehicles.some((vehicle) => vehicle.id === Number(form.vehicle_id))

    if (!isStillAvailable) {
      setForm((prev) => ({ ...prev, vehicle_id: '' }))
    }
  }, [
    availableVehicles,
    availableVehiclesError,
    availableVehiclesLoading,
    form.vehicle_id,
    hasTravelWindow,
    hasValidTravelWindow,
    showRequesterForm,
  ])

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      vehicle_id: Number(form.vehicle_id),
      pickup_location_id: form.pickup_location_id ? Number(form.pickup_location_id) : null,
      dropoff_location_id: form.dropoff_location_id ? Number(form.dropoff_location_id) : null,
      purpose: form.purpose.trim(),
      destination: form.destination.trim(),
      start_at: toSqlDateTime(form.start_at),
      end_at: toSqlDateTime(form.end_at),
      passengers: form.passengers ? Number(form.passengers) : null,
      passenger_names: form.passenger_names.map((name) => name.trim()),
      priority: form.priority,
      remarks: form.remarks.trim(),
    }

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId
      ? `${apiBasePrefix}/api/travel-requests/item?id=${editingId}`
      : `${apiBasePrefix}/api/travel-requests`

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to save request.')
        setSaving(false)
        return
      }

      await loadData()
      resetForm()
    } catch {
      setError('Unable to save request.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: TravelRequestItem) => {
    setEditingId(item.id)
    setShowRequesterForm(true)
    setAvailableVehiclesError('')
    setForm({
      vehicle_id: String(item.vehicle_id),
      pickup_location_id: item.pickup_location_id ? String(item.pickup_location_id) : '',
      dropoff_location_id: item.dropoff_location_id ? String(item.dropoff_location_id) : '',
      purpose: item.purpose,
      destination: item.destination ?? '',
      start_at: fromSqlDateTime(item.start_at),
      end_at: fromSqlDateTime(item.end_at),
      passengers: item.passengers ? String(item.passengers) : '',
      passenger_names: Array.from({ length: item.passengers ?? 0 }, (_, index) => item.passenger_names?.[index] ?? ''),
      priority: item.priority,
      remarks: item.remarks ?? '',
    })
  }

  const remakeRequest = (item: TravelRequestItem) => {
    setEditingId(null)
    setShowRequesterForm(true)
    setAvailableVehicles([])
    setAvailableVehiclesError('')
    setAvailableVehiclesLoading(false)
    setForm({
      vehicle_id: String(item.vehicle_id),
      pickup_location_id: item.pickup_location_id ? String(item.pickup_location_id) : '',
      dropoff_location_id: item.dropoff_location_id ? String(item.dropoff_location_id) : '',
      purpose: item.purpose,
      destination: item.destination ?? '',
      start_at: fromSqlDateTime(item.start_at),
      end_at: fromSqlDateTime(item.end_at),
      passengers: item.passengers ? String(item.passengers) : '',
      passenger_names: Array.from({ length: item.passengers ?? 0 }, (_, index) => item.passenger_names?.[index] ?? ''),
      priority: item.priority,
      remarks: item.remarks ?? '',
    })
    closeRequestView()
  }

  const cancelRequest = async (id: number) => {
    const confirmed = window.confirm('Cancel this pending travel request?')
    if (!confirmed) return

    const response = await fetch(`${apiBasePrefix}/api/travel-requests/cancel?id=${id}`, { method: 'POST' })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to cancel request.')
      return
    }
    await loadData()
  }

  const openRequestView = async (id: number) => {
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/travel-requests/item?id=${id}`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load request details.')
        return
      }

      const payload = (await response.json()) as { data?: TravelRequestItem; error?: string }
      setSelectedRequestId(id)
      setRejectReason('')
      setCancelApprovedReason('')
      setApprovalDriverId(payload.data?.assigned_driver_id ? String(payload.data.assigned_driver_id) : '')
      setApprovalVehicleId(payload.data?.vehicle_id ? String(payload.data.vehicle_id) : '')
    } catch {
      setError('Unable to load request details.')
    }
  }

  const closeRequestView = () => {
    setSelectedRequestId(null)
    setRejectReason('')
    setCancelApprovedReason('')
    setApprovalVehicleId('')
    setApprovalDriverId('')
    setApprovalAvailableVehicles([])
    setApprovalAvailableVehiclesLoading(false)
    setApprovalAvailableVehiclesError('')
  }

  const approveRequest = async (id: number) => {
    const response = await fetch(`${apiBasePrefix}/api/travel-requests/approve?id=${id}`, {
      method: 'POST',
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to approve request.')
      return
    }
    await loadData()
  }

  const submitReject = async (id: number) => {
    const response = await fetch(`${apiBasePrefix}/api/travel-requests/reject?id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason.trim() }),
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to reject request.')
      return
    }
    setRejectReason('')
    await loadData()
  }

  const updateApprovedAssignment = async (requestId: number) => {
    const response = await fetch(`${apiBasePrefix}/api/travel-requests/update-approved-assignment?id=${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: approvalVehicleId === '' ? undefined : Number(approvalVehicleId),
        driver_id: approvalDriverId === '' ? null : Number(approvalDriverId),
      }),
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to update assignment.')
      return
    }
    await loadData()
  }

  const managerCancelApproved = async (requestId: number) => {
    if (cancelApprovedReason.trim() === '') {
      setError('Cancellation remark is required.')
      return
    }

    const response = await fetch(`${apiBasePrefix}/api/travel-requests/manager-cancel?id=${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelApprovedReason.trim() }),
    })

    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setError(body.error ?? 'Failed to cancel approved request.')
      return
    }

    setCancelApprovedReason('')
    await loadData()
  }

  const openNewRequestForm = () => {
    setEditingId(null)
    setAvailableVehicles([])
    setAvailableVehiclesError('')
    setAvailableVehiclesLoading(false)
    setForm(createEmptyRequestForm())
    setShowRequesterForm(true)
  }

  useEffect(() => {
    if (!selectedRequest || !isAdmin || !['pending', 'approved'].includes(selectedRequest.status)) {
      setApprovalAvailableVehicles([])
      setApprovalAvailableVehiclesLoading(false)
      setApprovalAvailableVehiclesError('')
      return
    }

    const controller = new AbortController()

    const loadApprovalAvailableVehicles = async () => {
      setApprovalAvailableVehiclesLoading(true)
      setApprovalAvailableVehiclesError('')

      try {
        const params = new URLSearchParams({
          start_at: selectedRequest.start_at,
          end_at: selectedRequest.end_at,
          exclude_request_id: String(selectedRequest.id),
        })

        const response = await fetch(`${apiBasePrefix}/api/travel-requests/available-vehicles?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          const body = (await response.json()) as { error?: string }
          setApprovalAvailableVehicles([])
          setApprovalAvailableVehiclesError(body.error ?? 'Failed to load available vehicles.')
          return
        }

        const payload = (await response.json()) as { data: ManagedVehicle[] }
        setApprovalAvailableVehicles(payload.data)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setApprovalAvailableVehicles([])
        setApprovalAvailableVehiclesError('Unable to load available vehicles.')
      } finally {
        if (!controller.signal.aborted) {
          setApprovalAvailableVehiclesLoading(false)
        }
      }
    }

    loadApprovalAvailableVehicles().catch(() => {
      setApprovalAvailableVehicles([])
      setApprovalAvailableVehiclesError('Unable to load available vehicles.')
      setApprovalAvailableVehiclesLoading(false)
    })

    return () => controller.abort()
  }, [isAdmin, selectedRequest])

  useEffect(() => {
    if (!selectedRequest || !['pending', 'approved'].includes(selectedRequest.status)) {
      return
    }

    if (approvalVehicleId === '') {
      return
    }

    if (approvalAvailableVehiclesLoading || approvalAvailableVehiclesError !== '') {
      return
    }

    const isStillAvailable = approvalAvailableVehicles.some((vehicle) => vehicle.id === Number(approvalVehicleId))

    if (!isStillAvailable) {
      setApprovalVehicleId('')
    }
  }, [
    approvalAvailableVehicles,
    approvalAvailableVehiclesError,
    approvalAvailableVehiclesLoading,
    approvalVehicleId,
    selectedRequest,
  ])

  return (
    <div className="space-y-5">
      <FormModal
        onClose={resetForm}
        open={showRequesterForm}
        title={editingId ? `Edit Request #${editingId}` : 'Travel Request Form'}
        maxWidthClass="max-w-4xl"
      >
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitRequest}>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="whitespace-nowrap">Start</span>
            <input className="w-full rounded-xl border border-teal-200 px-3 py-2 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))} required type="datetime-local" value={form.start_at} />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="whitespace-nowrap">End</span>
            <input className="w-full rounded-xl border border-teal-200 px-3 py-2 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))} required type="datetime-local" value={form.end_at} />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Vehicle</span>
            <select
              className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              disabled={!hasValidTravelWindow || availableVehiclesLoading || availableVehiclesError !== ''}
              onChange={(event) => setForm((prev) => ({ ...prev, vehicle_id: event.target.value }))}
              required
              value={form.vehicle_id}
            >
              <option value="">{vehicleSelectPlaceholder}</option>
              {availableVehicleGroups.map((group) => (
                <optgroup key={group.serviceType} label={group.label}>
                  {group.items.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_code} - {vehicle.make} {vehicle.model}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className={`text-xs ${availableVehiclesError !== '' ? 'text-red-600' : 'text-slate-500'}`}>
              {vehicleAvailabilityHint}
            </p>
          </div>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))} value={form.priority}>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))} placeholder="Purpose" required value={form.purpose} />
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))} placeholder="Destination" value={form.destination} />
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, pickup_location_id: event.target.value }))} value={form.pickup_location_id}>
            <option value="">Pickup location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
          <select className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, dropoff_location_id: event.target.value }))} value={form.dropoff_location_id}>
            <option value="">Dropoff location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Number of Passengers
            <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" min={1} onChange={(event) => setForm((prev) => ({ ...prev, passengers: event.target.value }))} placeholder="Passengers" type="number" value={form.passengers} />
          </label>
          <input className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring" onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))} placeholder="Remarks" value={form.remarks} />
          {passengerCount > 0 ? (
            <div className="grid grid-cols-1 gap-2 md:col-span-2 md:grid-cols-2">
              {form.passenger_names.map((name, index) => (
                <input
                  className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  key={`passenger-${index}`}
                  onChange={(event) => {
                    const nextName = event.target.value
                    setForm((prev) => ({
                      ...prev,
                      passenger_names: prev.passenger_names.map((existing, currentIndex) => (
                        currentIndex === index ? nextName : existing
                      )),
                    }))
                  }}
                  placeholder={`Passenger ${index + 1} name`}
                  required
                  value={name}
                />
              ))}
            </div>
          ) : null}
          <div className="md:col-span-2">
            <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving...' : editingId ? 'Update Request' : 'Submit Request'}
            </button>
          </div>
        </form>
      </FormModal>

      {isRequester ? (
        <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Travel Request Form</h3>
            <button className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800" onClick={openNewRequestForm} type="button">
              Request New Travel
            </button>
          </div>
          <p className="text-sm text-slate-600">Create and manage your travel requests from the modal form.</p>
        </article>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <FormModal
        maxWidthClass="max-w-4xl"
        onClose={closeRequestView}
        open={selectedRequest !== null}
        title={selectedRequest ? `Request View: ${selectedRequest.reservation_no}` : 'Request View'}
      >
        {selectedRequest ? (
          <>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-700">Requester:</span> {selectedRequest.requester_name}
                <span className="text-slate-500"> ({selectedRequest.requester_phone ?? 'No contact number'})</span>
              </p>
              <p><span className="font-semibold text-slate-700">Vehicle:</span> {selectedRequest.vehicle_code} ({selectedRequest.vehicle_name})</p>
              <p><span className="font-semibold text-slate-700">Travel Date:</span> {formatDateRange(selectedRequest.start_at, selectedRequest.end_at)}</p>
              <p><span className="font-semibold text-slate-700">Status:</span> {selectedRequest.status}</p>
              <p><span className="font-semibold text-slate-700">Purpose:</span> {selectedRequest.purpose}</p>
              <p><span className="font-semibold text-slate-700">Destination:</span> {selectedRequest.destination ?? '-'}</p>
              <p><span className="font-semibold text-slate-700">Pickup:</span> {selectedRequest.pickup_location_name ?? '-'}</p>
              <p><span className="font-semibold text-slate-700">Dropoff:</span> {selectedRequest.dropoff_location_name ?? '-'}</p>
              <p><span className="font-semibold text-slate-700">Passengers:</span> {selectedRequest.passengers ?? '-'}</p>
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-700">Passenger List:</span>{' '}
                {selectedRequest.passenger_names && selectedRequest.passenger_names.length > 0
                  ? selectedRequest.passenger_names.join(', ')
                  : '-'}
              </p>
              <p><span className="font-semibold text-slate-700">Priority:</span> {selectedRequest.priority}</p>
              <p>
                <span className="font-semibold text-slate-700">Assigned Driver:</span> {selectedRequest.driver_name ?? '-'}
                {selectedRequest.driver_name ? (
                  <span className="text-slate-500"> ({selectedRequest.driver_phone ?? 'No contact number'})</span>
                ) : null}
              </p>
              <p><span className="font-semibold text-slate-700">Remarks:</span> {selectedRequest.remarks ?? '-'}</p>
              {selectedRequest.status === 'rejected' ? (
                <p className="md:col-span-2">
                  <span className="font-semibold text-slate-700">Rejection Reason:</span>{' '}
                  {getRejectionReason(selectedRequest)}
                </p>
              ) : null}
              {selectedRequest.status === 'cancelled' ? (
                <p className="md:col-span-2">
                  <span className="font-semibold text-slate-700">Cancellation Reason:</span>{' '}
                  {getCancellationReason(selectedRequest)}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => printTravelRequest(selectedRequest)} type="button">Print Request</button>
              {isRequester && selectedRequest.status === 'pending' ? (
                <>
                  <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => startEdit(selectedRequest)} type="button">Edit Request</button>
                  <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => cancelRequest(selectedRequest.id).catch(() => setError('Failed to cancel request.'))} type="button">Cancel Request</button>
                </>
              ) : null}
              {isRequester && ['cancelled', 'rejected'].includes(selectedRequest.status) ? (
                <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800" onClick={() => remakeRequest(selectedRequest)} type="button">Remake Request</button>
              ) : null}
              {isAdmin && selectedRequest.status === 'pending' ? (
                <>
                  <select
                    className="rounded-lg border border-teal-200 px-2 py-1 text-xs text-teal-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={approvalAvailableVehiclesLoading || approvalAvailableVehiclesError !== ''}
                    onChange={(event) => setApprovalVehicleId(event.target.value)}
                    value={approvalVehicleId}
                  >
                    <option value="">{approvalVehiclePlaceholder}</option>
                    {approvalAvailableVehicleGroups.map((group) => (
                      <optgroup key={group.serviceType} label={group.label}>
                        {group.items.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_code} - {vehicle.make} {vehicle.model}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select className="rounded-lg border border-teal-200 px-2 py-1 text-xs text-teal-800" onChange={(event) => setApprovalDriverId(event.target.value)} value={approvalDriverId}>
                    <option value="">No driver assigned</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>{driver.name}</option>
                    ))}
                  </select>
                  <p className={`self-center text-xs ${approvalAvailableVehiclesError !== '' ? 'text-red-600' : 'text-slate-500'}`}>
                    {approvalVehicleHint}
                  </p>
                  <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={approvalVehicleId === '' || approvalAvailableVehiclesLoading || approvalAvailableVehiclesError !== ''} onClick={() => updateApprovedAssignment(selectedRequest.id).catch(() => setError('Failed to save assignment.'))} type="button">Save Assignment</button>
                </>
              ) : null}
              {isCao && selectedRequest.status === 'pending' ? (
                <>
                  <p className={`self-center text-xs ${selectedRequest.assigned_driver_id === null ? 'text-amber-700' : 'text-slate-500'}`}>
                    {selectedRequest.assigned_driver_id === null
                      ? 'Admin must assign a driver before CAO approval.'
                      : `Assigned vehicle ${selectedRequest.vehicle_code} and driver ${selectedRequest.driver_name ?? 'Pending assignment'} ready for approval.`}
                  </p>
                  <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={selectedRequest.assigned_driver_id === null} onClick={() => approveRequest(selectedRequest.id).catch(() => setError('Failed to approve request.'))} type="button">Approve Request</button>
                  <input className="rounded-lg border border-red-200 px-2 py-1 text-xs" onChange={(event) => setRejectReason(event.target.value)} placeholder="Reject reason" value={rejectReason} />
                  <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700" onClick={() => submitReject(selectedRequest.id).catch(() => setError('Failed to reject request.'))} type="button">Reject</button>
                </>
              ) : null}
              {isAdmin && selectedRequest.status === 'approved' ? (
                <>
                  <select
                    className="rounded-lg border border-teal-200 px-2 py-1 text-xs text-teal-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={approvalAvailableVehiclesLoading || approvalAvailableVehiclesError !== ''}
                    onChange={(event) => setApprovalVehicleId(event.target.value)}
                    value={approvalVehicleId}
                  >
                    <option value="">Assigned vehicle</option>
                    {approvalAvailableVehicleGroups.map((group) => (
                      <optgroup key={group.serviceType} label={group.label}>
                        {group.items.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_code} - {vehicle.make} {vehicle.model}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select className="rounded-lg border border-teal-200 px-2 py-1 text-xs text-teal-800" onChange={(event) => setApprovalDriverId(event.target.value)} value={approvalDriverId}>
                    <option value="">No driver assigned</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>{driver.name}</option>
                    ))}
                  </select>
                  <p className={`self-center text-xs ${approvalAvailableVehiclesError !== '' ? 'text-red-600' : 'text-slate-500'}`}>
                    {approvalVehicleHint}
                  </p>
                  <button className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={approvalVehicleId === '' || approvalAvailableVehiclesLoading || approvalAvailableVehiclesError !== ''} onClick={() => updateApprovedAssignment(selectedRequest.id).catch(() => setError('Failed to update assignment.'))} type="button">Save Assignment</button>
                  <input className="rounded-lg border border-red-200 px-2 py-1 text-xs" onChange={(event) => setCancelApprovedReason(event.target.value)} placeholder="Cancellation remark" value={cancelApprovedReason} />
                  <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={cancelApprovedReason.trim() === ''} onClick={() => managerCancelApproved(selectedRequest.id).catch(() => setError('Failed to cancel approved request.'))} type="button">Cancel Approved</button>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </FormModal>

      <article className="rounded-2xl border border-teal-100 bg-white">
        <div className="flex items-center justify-between border-b border-teal-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Travel Requests</h3>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800 transition hover:bg-teal-50"
              onClick={() => {
                setFilterReference('')
                setFilterRequesterId('')
                setFilterVehicleId('')
                setFilterTravelDate('')
                setFilterDriverId('')
              }}
              type="button"
            >
              Clear Filters
            </button>
            <button className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-800" onClick={() => loadData()} type="button">
              Refresh
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-teal-100 px-4 py-3">
          {statusTabs.map((tab) => {
            const count = tab.key === 'all'
              ? requests.length
              : requests.filter((item) => item.status === tab.key).length
            const active = statusTab === tab.key

            return (
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
                }`}
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                type="button"
              >
                {tab.label} ({count})
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-1 gap-2 border-b border-teal-100 px-4 py-3 md:grid-cols-6">
          <input
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setFilterReference(event.target.value)}
            placeholder="Search reference #"
            value={filterReference}
          />
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setFilterRequesterId(event.target.value)}
            value={filterRequesterId}
          >
            <option value="">All requesters</option>
            {requesterOptions.map((requester) => (
              <option key={requester.id} value={requester.id}>{requester.name}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setFilterVehicleId(event.target.value)}
            value={filterVehicleId}
          >
            <option value="">All vehicles</option>
            {groupedVehicles.map((group) => (
              <optgroup key={group.serviceType} label={group.label}>
                {group.items.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_code} ({vehicle.make} {vehicle.model})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            className="rounded-xl border border-teal-200 px-3 py-2 text-xs outline-none ring-teal-400 focus:ring"
            onChange={(event) => setFilterDriverId(event.target.value)}
            value={filterDriverId}
          >
            <option value="">All drivers</option>
            {driverOptions.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
          <label className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-teal-200 px-3 py-2 text-xs text-slate-600 ring-teal-400 focus-within:ring md:col-span-2">
            <span className="whitespace-nowrap">Travel Date</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs outline-none"
              onChange={(event) => setFilterTravelDate(event.target.value)}
              type="date"
              value={filterTravelDate}
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading requests...</td></tr> : null}
              {!loading && filteredRequests.length === 0 ? <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No travel requests found for current filters.</td></tr> : null}
              {!loading ? pagedFilteredRequests.map((item) => (
                <tr
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-teal-50/40"
                  key={item.id}
                  onClick={() => openRequestView(item.id).catch(() => setError('Failed to load request view.'))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openRequestView(item.id).catch(() => setError('Failed to load request view.'))
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{item.reservation_no}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{item.requester_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.requester_phone ?? 'No contact number'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.vehicle_code} ({item.vehicle_name})</td>
                  <td className="px-4 py-3 text-slate-700">{formatDateRange(item.start_at, item.end_at)}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${requestStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                      {item.status === 'cancelled' ? (
                        <p className="max-w-xs text-xs leading-5 text-slate-500">
                          Reason: {getCancellationReason(item)}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{item.driver_name ?? '-'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.driver_name ? (item.driver_phone ?? 'No contact number') : '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                        onClick={(event) => {
                          event.stopPropagation()
                          openRequestView(item.id).catch(() => setError('Failed to load request view.'))
                        }}
                        type="button"
                      >
                        View
                      </button>
                      <button
                        className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                        onClick={(event) => {
                          event.stopPropagation()
                          printTravelRequest(item)
                        }}
                        type="button"
                      >
                        Print
                      </button>
                      {isRequester && item.status === 'pending' ? (
                        <button
                          className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                          onClick={(event) => {
                            event.stopPropagation()
                            startEdit(item)
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                      ) : null}
                      {isRequester && ['cancelled', 'rejected'].includes(item.status) ? (
                        <button
                          className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800"
                          onClick={(event) => {
                            event.stopPropagation()
                            remakeRequest(item)
                          }}
                          type="button"
                        >
                          Remake
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>
        {!loading ? (
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={filteredRequests.length}
          />
        ) : null}
      </article>
    </div>
  )
}


export default TravelRequestsPage

