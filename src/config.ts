export const navigationSections = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Calendar', path: '/calendar' },
      { label: 'Travel Requests', path: '/travel-requests' },
      { label: 'Driver Schedules', path: '/driver-schedules' },
      { label: 'Driver Work Schedules', path: '/driver-work-schedules' },
      { label: 'Trip Logs', path: '/trip-logs' },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { label: 'Vehicles', path: '/vehicles' },
      { label: 'Maintenance', path: '/maintenance-records' },
      { label: 'Fuel Logs', path: '/fuel-logs' },
      { label: 'Locations', path: '/locations' },
      { label: 'Vehicle Types', path: '/vehicle-types' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', path: '/users' },
      { label: 'Drivers', path: '/drivers' },
      { label: 'Reports', path: '/reports' },
      { label: 'Audit Logs', path: '/audit-logs' },
      { label: 'Settings', path: '/settings' },
    ],
  },
]

export const navigation = navigationSections.flatMap((section) => section.items)

declare global {
  interface Window {
    __VMRS_BASE_PATH__?: string
  }
}

const normalizeBasePath = (value: string | undefined): string => {
  if (!value) {
    return ''
  }

  const trimmed = value.trim().replace(/^\/+|\/+$/g, '')
  return trimmed === '' ? '' : `/${trimmed}`
}

export const appBasePath = normalizeBasePath(window.__VMRS_BASE_PATH__)
export const apiBasePrefix = appBasePath
