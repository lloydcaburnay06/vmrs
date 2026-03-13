export type DashboardSummary = {
  scopeLabel: string
  metrics: {
    total_requests: number
    pending_requests: number
    approved_unassigned: number
    active_trips: number
    completed_this_month: number
    available_vehicles: number
    vehicles_in_maintenance: number
    active_drivers: number
  }
  fuel_snapshot: {
    entries_this_month: number
    liters_this_month: number
    cost_this_month: number
  }
  maintenance_snapshot: {
    open: number
    in_progress: number
    completed_this_month: number
  }
  request_statuses: Array<{
    status: TravelRequestItem['status']
    count: number
  }>
  fleet_statuses: Array<{
    status: ManagedVehicle['status']
    count: number
  }>
  daily_trip_counts: Array<{
    date: string
    label: string
    count: number
  }>
  urgent_items: {
    vehicle_documents: Array<{
      id: number
      vehicle_code: string
      vehicle_name: string
      registration_expiry: string | null
      insurance_expiry: string | null
      days_to_registration: number | null
      days_to_insurance: number | null
    }>
    driver_licenses: Array<{
      id: number
      driver_name: string
      license_expiry: string
      days_remaining: number
    }>
    maintenance_due: Array<{
      id: number
      vehicle_code: string
      vehicle_name: string
      next_service_date: string
      status: MaintenanceRecordItem['status']
      days_remaining: number
    }>
  }
  recent_requests: Array<{
    id: number
    reservation_no: string
    requester_name: string
    vehicle_code: string
    purpose: string
    start_at: string
    status: TravelRequestItem['status']
    driver_name: string | null
  }>
  recent_trips: Array<{
    id: number
    reservation_no: string
    vehicle_code: string
    driver_name: string | null
    check_out_at: string | null
    check_in_at: string | null
    distance_km: string | null
    status: 'active' | 'completed'
  }>
}

export type AuthUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
  employee_no?: string | null
  phone?: string | null
  status?: 'active' | 'inactive' | 'suspended'
  created_at?: string
  updated_at?: string
}

export type ProfileSettingsUser = {
  id: number
  employee_no: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  role: string
  created_at: string
  updated_at: string
}

export type AuditLogItem = {
  id: number
  user_id: number | null
  user_name: string | null
  user_email: string | null
  action: string
  entity_type: string
  entity_id: number | null
  ip_address: string | null
  user_agent: string | null
  payload: string | null
  created_at: string
}

export type ManagedUser = {
  id: number
  role_id: number
  role_name: string
  employee_no: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export type RoleOption = {
  id: number
  name: string
}

export type VehicleOption = {
  id: number
  name: string
  assignment_type?: 'administrative' | 'ambulance'
}

export type ManagedVehicle = {
  id: number
  vehicle_code: string
  plate_no: string
  vin: string | null
  type_id: number
  type_name: string
  service_type: 'ambulance' | 'administrative'
  current_location_id: number | null
  location_name: string | null
  make: string
  model: string
  year: number | null
  color: string | null
  transmission: string | null
  fuel_type: string | null
  seats: number | null
  payload_kg: string | null
  odometer_km: string
  status: 'available' | 'reserved' | 'in_use' | 'maintenance' | 'inactive'
  registration_expiry: string | null
  insurance_expiry: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ManagedDriver = {
  id: number
  employee_no: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  dl_id_number: string | null
  license_expiry: string | null
  assignment_type: 'administrative' | 'ambulance'
  created_at: string
  updated_at: string
}

export type TravelRequestItem = {
  id: number
  reservation_no: string
  vehicle_id: number
  vehicle_code: string
  plate_no: string
  vehicle_name: string
  requester_id: number
  requester_name: string
  approver_id: number | null
  approver_name: string | null
  assigned_driver_id: number | null
  driver_name: string | null
  pickup_location_id: number | null
  pickup_location_name: string | null
  dropoff_location_id: number | null
  dropoff_location_name: string | null
  purpose: string
  destination: string | null
  start_at: string
  end_at: string
  passengers: number | null
  passenger_names?: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'completed' | 'no_show'
  rejection_reason: string | null
  remarks: string | null
  approved_at: string | null
  assigned_at: string | null
  created_at: string
  updated_at: string
}

export type CalendarTravelItem = {
  id: number
  reservation_no: string
  start_at: string
  end_at: string
  purpose: string
  destination: string | null
  vehicle_code: string
  vehicle_name: string
  requester_name: string
  driver_name: string | null
  pickup_location_name: string | null
  dropoff_location_name: string | null
}

export type DriverScheduleItem = {
  id: number
  reservation_no: string
  status: 'approved' | 'active' | 'completed'
  start_at: string
  end_at: string
  purpose: string
  destination: string | null
  pickup_location_id?: number | null
  pickup_location_name?: string | null
  passengers?: number | null
  remarks?: string | null
  assigned_driver_id: number | null
  driver_name: string | null
  vehicle_id: number
  vehicle_code: string
  vehicle_name: string
  requester_name: string
}

export type DriverWorkScheduleItem = {
  id: number
  driver_id: number
  driver_name: string
  work_date: string
  start_time: string | null
  end_time: string | null
  shift_code?: 'S8_5' | 'S6_2' | 'S2_10' | 'S10_6' | 'OFF' | 'H_OFF' | 'CO' | 'LEAVE' | 'OB' | 'OT'
  shift_type: 'regular' | 'overtime' | 'off' | 'leave'
  status: 'scheduled' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export type TripLogItem = {
  id: number
  reservation_id: number
  reservation_no: string
  status: 'active' | 'completed'
  vehicle_id: number
  vehicle_code: string
  vehicle_name: string
  requester_id: number
  requester_name: string
  driver_id: number | null
  driver_name: string | null
  purpose: string
  destination: string | null
  pickup_location_id?: number | null
  pickup_location_name?: string | null
  passengers?: number | null
  remarks?: string | null
  scheduled_start_at: string
  scheduled_end_at: string
  actual_start_at: string | null
  actual_end_at: string | null
  check_out_at: string | null
  check_in_at: string | null
  start_odometer_km: string | null
  end_odometer_km: string | null
  distance_km: string | null
  fuel_used_liters: string | null
  incident_report: string | null
  created_at: string
  updated_at: string
}

export type MaintenanceRecordItem = {
  id: number
  vehicle_id: number
  vehicle_code: string
  vehicle_name: string
  recorded_by: number | null
  recorded_by_name: string | null
  maintenance_type: 'preventive' | 'corrective' | 'inspection' | 'emergency'
  description: string
  vendor: string | null
  service_date: string
  odometer_km: string | null
  cost: string | null
  next_service_date: string | null
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export type FuelLogItem = {
  id: number
  vehicle_id: number
  vehicle_code: string
  vehicle_name: string
  recorded_by: number | null
  recorded_by_name: string | null
  fueled_at: string
  odometer_km: string | null
  liters: string
  unit_price: string | null
  total_cost: string | null
  fuel_station: string | null
  notes: string | null
  created_at: string
}

export type ManagedLocation = {
  id: number
  name: string
  address_line: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export type ManagedVehicleType = {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}
