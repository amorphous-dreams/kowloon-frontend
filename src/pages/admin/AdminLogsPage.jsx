// AdminLogsPage — live tail of the server log file for tester bug reporting.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Copy, Check, RefreshCw, Download } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import Spinner from '../../components/ui/Spinner'

const TAIL_OPTIONS  = [50, 100, 200, 500, 1000]
const LEVEL_OPTIONS = [
  { value: 'all',   label: 'All' },
  { value: 'error', label: 'Errors' },
  { value: 'warn',  label: 'Warnings' },
  { value: 'info',  label: 'Info' },
]
const REFRESH_OPTIONS = [
  { value: 0,    label: 'Off' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
]

function lineColor(line) {
  const u = line.toUpperCase()
  if (u.includes(' ERROR:')) return 'text-error'
  if (u.includes(' WARN:'))  return 'text-warning'
  if (u.includes(' DEBUG:')) return 'text-neutral-content/30'
  return 'text-neutral-content/80'
}

export default function AdminLogsPage() {
  const client = useClient()
  const [lines,   setLines]   = useState([])
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState(null)
  const [error,   setError]   = useState(null)
  const [tail,    setTail]    = useState(200)
  const [level,   setLevel]   = useState('all')
  const [refresh, setRefresh] = useState(5000)
  const [copied,  setCopied]  = useState(false)
  const [denied,  setDenied]  = useState(false)
  const scrollRef = useRef(null)
  const pollRef   = useRef(null)

  const load = useCallback(async (isManual = false) => {
    if (!client) return
    if (isManual) setLoading(true)
    setError(null)
    try {
      const res = await client.admin.getLogs({ tail, level })
      setLines(res?.lines ?? [])
      setWarning(res?.warning ?? null)
    } catch (err) {
      if (err?.statusCode === 403) { setDenied(true); return }
      setError(err?.message || 'Failed to load logs')
    } finally {
      if (isManual) setLoading(false)
      else setLoading(false)
    }
  }, [client, tail, level])

  // Initial load and when params change
  useEffect(() => { load(true) }, [load])

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Auto-refresh
  useEffect(() => {
    clearInterval(pollRef.current)
    if (refresh > 0) {
      pollRef.current = setInterval(() => load(false), refresh)
    }
    return () => clearInterval(pollRef.current)
  }, [refresh, load])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kowloon-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (denied) return (
    <div className="py-16 text-center">
      <p className="font-display text-3xl tracking-wide">Access Denied</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 h-full">

      <div className="flex items-baseline justify-between border-b-2 border-base-300 pb-4">
        <h1 className="font-display text-5xl tracking-wide">Logs</h1>
        <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
          {lines.length} {lines.length === 1 ? 'line' : 'lines'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Tail size */}
        <div className="flex items-center gap-2">
          <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Last</label>
          <select value={tail} onChange={(e) => setTail(Number(e.target.value))}
            className="border border-base-300 bg-base-100 px-2 py-1 font-ui text-xs outline-none focus:border-primary">
            {TAIL_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} lines</option>
            ))}
          </select>
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-2">
          <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}
            className="border border-base-300 bg-base-100 px-2 py-1 font-ui text-xs outline-none focus:border-primary">
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Auto-refresh */}
        <div className="flex items-center gap-2">
          <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Refresh</label>
          <select value={refresh} onChange={(e) => setRefresh(Number(e.target.value))}
            className="border border-base-300 bg-base-100 px-2 py-1 font-ui text-xs outline-none focus:border-primary">
            {REFRESH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => load(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 font-ui text-xs uppercase tracking-widest border border-base-300 hover:border-primary text-base-content/60 hover:text-base-content transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>
          <button type="button" onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 font-ui text-xs uppercase tracking-widest border border-base-300 hover:border-primary text-base-content/60 hover:text-base-content transition-colors">
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 font-ui text-xs uppercase tracking-widest border border-base-300 hover:border-primary text-base-content/60 hover:text-base-content transition-colors">
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {warning && (
        <p className="font-ui text-xs text-warning uppercase tracking-widest">{warning}</p>
      )}
      {error && (
        <p className="font-ui text-xs text-error">{error}</p>
      )}

      {/* Log output */}
      <div
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault()
            const sel = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(e.currentTarget)
            sel.removeAllRanges()
            sel.addRange(range)
          }
        }}
        className="flex-1 bg-neutral text-neutral-content min-h-[60vh] max-h-[72vh] overflow-y-auto border-2 border-base-300 p-4 font-mono text-xs leading-relaxed outline-none"
        style={{ colorScheme: 'dark' }}
      >
        {loading ? (
          <Spinner />
        ) : lines.length === 0 ? (
          <p className="text-base-content/30 italic">No log entries yet.</p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all ${lineColor(line)}`}>
              {line}
            </div>
          ))
        )}
      </div>

      <p className="font-ui text-xs text-base-content/30 uppercase tracking-widest">
        Showing last {tail} lines &mdash; auto-refresh {refresh > 0 ? `every ${refresh / 1000}s` : 'off'}.
        Use Copy or Download to share with a developer.
      </p>
    </div>
  )
}
