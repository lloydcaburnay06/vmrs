const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/

const manilaDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const manilaDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const manilaPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

type DateParts = {
  year: number
  month: number
  day: number
}

type DateTimeParts = DateParts & {
  hour: number
  minute: number
  second: number
}

export const APP_TIME_ZONE = 'Asia/Manila'

const parseDate = (value: string): DateParts | null => {
  const match = value.match(DATE_PATTERN)
  if (!match) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

const parseDateTime = (value: string): DateTimeParts | null => {
  const match = value.match(DATE_TIME_PATTERN)
  if (!match) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? '0'),
  }
}

const formatParsedDate = ({ year, month, day }: DateParts): string =>
  `${SHORT_MONTH_NAMES[month - 1]} ${day}, ${year}`

const formatHourMinute = (hour: number, minute: number): string => {
  const normalizedHour = hour % 24
  const hour12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12
  const meridiem = normalizedHour >= 12 ? 'PM' : 'AM'

  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`
}

const formatParsedDateTime = ({ year, month, day, hour, minute }: DateTimeParts): string =>
  `${formatParsedDate({ year, month, day })} ${formatHourMinute(hour, minute)}`

const getDatePartsInTimeZone = (value: Date): DateParts => {
  const partMap = Object.fromEntries(
    manilaPartsFormatter
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
  }
}

const toYmd = ({ year, month, day }: DateParts): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) {
    return '-'
  }

  if (value instanceof Date) {
    return manilaDateFormatter.format(value)
  }

  const parsedDate = parseDate(value)
  if (parsedDate) {
    return formatParsedDate(parsedDate)
  }

  const parsedDateTime = parseDateTime(value)
  if (parsedDateTime) {
    return formatParsedDate(parsedDateTime)
  }

  const parsedValue = new Date(value)
  return Number.isNaN(parsedValue.getTime()) ? value : manilaDateFormatter.format(parsedValue)
}

export const formatDateTime = (value: Date | string | null | undefined): string => {
  if (!value) {
    return '-'
  }

  if (value instanceof Date) {
    return manilaDateTimeFormatter.format(value)
  }

  const parsedDateTime = parseDateTime(value)
  if (parsedDateTime) {
    return formatParsedDateTime(parsedDateTime)
  }

  const parsedDate = parseDate(value)
  if (parsedDate) {
    return formatParsedDate(parsedDate)
  }

  const parsedValue = new Date(value)
  return Number.isNaN(parsedValue.getTime()) ? value : manilaDateTimeFormatter.format(parsedValue)
}

export const formatDateRange = (
  startValue: Date | string | null | undefined,
  endValue: Date | string | null | undefined,
): string => `${formatDateTime(startValue)} to ${formatDateTime(endValue)}`

export const formatTime = (value: string | null | undefined): string => {
  if (!value) {
    return '-'
  }

  const match = value.match(TIME_PATTERN)
  if (!match) {
    return value
  }

  return formatHourMinute(Number(match[1]), Number(match[2]))
}

export const formatMonthYear = (value: Date): string => {
  const month = value.getMonth()
  const year = value.getFullYear()
  return `${LONG_MONTH_NAMES[month]} ${year}`
}

export const getCurrentMonthRange = (value: Date = new Date()): { start: string; end: string } => {
  const today = getDatePartsInTimeZone(value)
  const daysInMonth = new Date(today.year, today.month, 0).getDate()

  return {
    start: toYmd({ year: today.year, month: today.month, day: 1 }),
    end: toYmd({ year: today.year, month: today.month, day: daysInMonth }),
  }
}

export const getCurrentMonthCursor = (value: Date = new Date()): Date => {
  const today = getDatePartsInTimeZone(value)
  return new Date(today.year, today.month - 1, 1)
}
