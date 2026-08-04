// Timestamp — relative or absolute date with full datetime tooltip.
// Props: date (ISO string or Date), absolute (bool), to (optional route — wraps in Link)

import { Link } from 'react-router-dom'

function formatRelative(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30)  return `${days}d ago`
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Compact form used in feed cards — mirrors the app's timeAgo ("now", "4m",
// "3h", "2d", "5w", then an absolute date). Keep in sync with
// mobile/src/lib/timeAgo.js.
function formatCompact(date) {
  const then = new Date(date).getTime()
  const sec = Math.round((Date.now() - then) / 1000)
  if (sec < 45) return 'now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk}w`
  const d = new Date(then)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

export default function Timestamp({ date, absolute = false, compact = false, to, className }) {
  if (!date) return null
  const full = new Date(date).toLocaleString()
  const display = absolute ? full : compact ? formatCompact(date) : formatRelative(date)

  const time = (
    <time
      dateTime={new Date(date).toISOString()}
      title={full}
      className={className ?? 'font-ui text-xs sm:text-sm text-base-content/70 uppercase tracking-widest'}
    >
      {display}
    </time>
  )

  return to
    ? <Link to={to} className="hover:text-primary transition-colors">{time}</Link>
    : time
}
