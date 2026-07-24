// ServerPage — /server/:domain
// Profile for a remote Kowloon server, from the local cache (GET /servers/:domain
// via client.feeds.getServer). Shows the server's identity + the public circles,
// groups, and pages it has cached. Browsing the remote server's posts/feed is
// part of the deeper federation work (cross-origin) and not done here.

import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ExternalLink, Users } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import CircleIcon from '../components/ui/CircleIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

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

function EntityCard({ item, to, type }) {
  const blurb = stripHtml(item.summary || item.description)
  const inner = (
    <>
      {item.icon
        ? <img loading="lazy" src={item.icon} alt="" className="w-10 h-10 object-cover shrink-0" style={hexMask} />
        : <div className="w-10 h-10 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
            <CircleIcon type={type} size="md" className="opacity-70 text-secondary-content" />
          </div>
      }
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="font-ui text-sm font-bold text-base-content truncate">{item.name}</span>
        {typeof item.memberCount === 'number' && item.memberCount > 0 && (
          <span className="font-ui text-xs uppercase tracking-widest text-base-content/50">
            {item.memberCount.toLocaleString()} members
          </span>
        )}
        {blurb && <p className="font-reading text-sm text-base-content/70 leading-snug line-clamp-2">{blurb}</p>}
      </div>
    </>
  )
  return to
    ? <Link to={to} className="flex items-start gap-3 py-3 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors">{inner}</Link>
    : <div className="flex items-start gap-3 py-3 border-b border-base-300">{inner}</div>
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-2xl tracking-wide border-b-2 border-base-300 pb-2">{title}</h2>
      {children}
    </div>
  )
}

export default function ServerPage() {
  const { domain } = useParams()
  const client = useClient()
  const { t } = useTranslation()

  const [server, setServer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!client || !domain) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.getServer({ domain })
      setServer(res?.server ?? res?.item ?? res ?? null)
    } catch (err) {
      setError(err?.message || 'Could not load this server.')
    } finally {
      setLoading(false)
    }
  }, [client, domain])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner centered />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!server) return null

  const name = server.name || domain
  const externalUrl = server.url || `https://${domain}`
  const circles = server.cachedCircles ?? []
  const groups = server.cachedGroups ?? []
  const pages = server.cachedPages ?? []

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-start gap-4 border-b-2 border-base-300 pb-6">
        {server.icon
          ? <img src={server.icon} alt="" className="w-20 h-20 object-cover shrink-0" style={hexMask} />
          : <div className="w-20 h-20 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
              <Globe size={28} className="text-secondary-content opacity-70" />
            </div>
        }
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <h1 className="font-display text-4xl leading-none tracking-wide">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs uppercase tracking-widest text-base-content/60">
            <span className="flex items-center gap-1"><Globe size={10} />{domain}</span>
            {typeof server.userCount === 'number' && (
              <><span className="text-base-content/30">·</span>
              <span className="flex items-center gap-1"><Users size={10} />{server.userCount.toLocaleString()} users</span></>
            )}
          </div>
          {server.description && (
            <p className="font-reading text-base text-base-content/80 leading-relaxed">
              {stripHtml(server.description)}
            </p>
          )}
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-primary hover:opacity-70 transition-opacity self-start mt-1"
          >
            <ExternalLink size={11} /> {t('server.visit', { defaultValue: `Visit ${domain}` })}
          </a>
        </div>
      </div>

      {circles.length > 0 && (
        <Section title={t('circle.circles', { defaultValue: 'Circles' })}>
          <div className="flex flex-col">
            {circles.map((c) => (
              <EntityCard key={c.id} item={c} type="circle" to={c.id ? `/circles/${encodeURIComponent(c.id)}` : null} />
            ))}
          </div>
        </Section>
      )}

      {groups.length > 0 && (
        <Section title={t('group.groups', { defaultValue: 'Groups' })}>
          <div className="flex flex-col">
            {groups.map((g) => (
              <EntityCard key={g.id} item={g} type="group" to={g.id ? `/groups/${encodeURIComponent(g.id)}` : null} />
            ))}
          </div>
        </Section>
      )}

      {pages.length > 0 && (
        <Section title={t('page.pages', { defaultValue: 'Pages' })}>
          <div className="flex flex-col">
            {pages.map((p) => (
              <a
                key={p.id || p.url}
                href={p.url || externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-3 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
              >
                <ExternalLink size={12} className="text-base-content/40 shrink-0" />
                <span className="font-ui text-sm text-base-content truncate flex-1">{p.title || p.name}</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {circles.length === 0 && groups.length === 0 && pages.length === 0 && (
        <p className="font-ui text-sm text-base-content/50">
          {t('server.nothingCached', { defaultValue: 'Nothing public cached from this server yet.' })}
        </p>
      )}
    </div>
  )
}
