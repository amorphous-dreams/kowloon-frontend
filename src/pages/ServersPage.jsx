// ServersPage — /servers
// Browse remote Kowloon servers known to this server (client.feeds.getServers).
// Each row links to that server's profile at /server/:domain. Web counterpart of
// the mobile servers.js screen.

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import sizedUrl from '../lib/sizedUrl'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

function stripHtml(s) {
  return typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : ''
}

function ServerRow({ server }) {
  const icon = server.icon
  const desc = stripHtml(server.description)
  return (
    <Link
      to={`/server/${encodeURIComponent(server.domain)}`}
      className="flex items-start gap-4 py-5 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
    >
      {icon
        ? <img loading="lazy" src={sizedUrl(icon, 200)} alt="" className="w-11 h-11 object-cover shrink-0" style={hexMask} />
        : <div className="w-11 h-11 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
            <Globe size={20} className="text-secondary-content opacity-70" />
          </div>}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="font-display text-2xl tracking-wide leading-none">{server.name || server.domain}</span>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/55">
          {server.domain}
          {typeof server.userCount === 'number' ? ` · ${server.userCount.toLocaleString()} users` : ''}
        </span>
        {desc && (
          <p className="font-reading text-sm text-base-content/70 leading-snug line-clamp-2 mt-0.5">{desc}</p>
        )}
      </div>
    </Link>
  )
}

export default function ServersPage() {
  const { t } = useTranslation()
  const client = useClient()

  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.getServers({ limit: 50, sort: 'name' })
      setServers(res?.orderedItems ?? res?.items ?? [])
    } catch (e) {
      setError(e?.message || 'Could not load servers.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b-2 border-base-300 pb-4">
        <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
          {t('server.explore', { defaultValue: 'Explore the network' })}
        </p>
        <h1 className="font-display text-5xl tracking-wide leading-none">
          {t('nav.servers', { defaultValue: 'Servers' })}
        </h1>
      </div>

      {loading ? (
        <Spinner centered />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : servers.length === 0 ? (
        <EmptyState message={t('server.noneDiscovered', { defaultValue: 'No other servers discovered yet. Add a server to one of your Circles to start discovering.' })} />
      ) : (
        <div className="flex flex-col">
          {servers.map((s) => <ServerRow key={s.domain} server={s} />)}
        </div>
      )}
    </div>
  )
}
