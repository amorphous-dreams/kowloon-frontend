// ActiveGroups — sidebar widget showing groups with recent post activity.
// Shows group icon, name, member count, and a snippet of the most recent post.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import CircleIcon from '../ui/CircleIcon'


function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

function GroupAvatar({ group }) {
  if (group.icon) {
    return (
      <img
        src={group.icon}
        alt={group.name}
        className="w-9 h-9 object-cover shrink-0 bg-base-300"
        style={hexMask}
      />
    )
  }
  return (
    <div className="w-9 h-9 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
      <Users size={16} className="text-secondary-content opacity-70" />
    </div>
  )
}

export default function ActiveGroups() {
  const { t } = useTranslation()
  const client = useClient()
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!client) return
    client.feeds.getGroups({ limit: 5 })
      .then((res) => setGroups(res?.orderedItems ?? []))
      .catch(() => {})
  }, [client])

  if (!groups.length) return null

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 mb-3" style={{ minHeight: '36px' }}>
        <CircleIcon type="group" size="lg" className="opacity-50 !w-11 !h-11" />
        <h3 className="font-display text-3xl tracking-wide text-base-content leading-none">{t('sidebar.activeGroups')}</h3>
      </div>
      <ul className="flex flex-col gap-0">
        {groups.map((group) => (
          <li key={group.id} className="flex flex-col gap-1.5 py-3 border-b border-base-300 last:border-b-0">

            {/* Icon column + text column */}
            <div className="flex items-start gap-2">
              <div className="w-11 flex items-center justify-center self-start shrink-0" style={{ minHeight: '36px' }}>
                <GroupAvatar group={group} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center" style={{ minHeight: '36px' }}>
                  <Link
                    to={`/groups/${encodeURIComponent(group.id)}`}
                    className="font-display text-xl leading-none tracking-wide hover:text-primary transition-colors"
                  >
                    {group.name}
                  </Link>
                </div>
                <span className="font-ui text-xs uppercase tracking-widest text-base-content/65">
                  {group.memberCount.toLocaleString()} members
                </span>
              </div>
            </div>

            {/* Most recent post snippet */}
            {group.recentPost && (
              <div className="flex flex-col gap-0.5 pl-[52px]">
                <p className="font-reading text-base text-base-content/75 leading-snug line-clamp-2">
                  {group.recentPost.summary}
                </p>
                <span className="font-ui text-xs uppercase tracking-widest text-base-content/65">
                  {group.recentPost.attributedTo?.name ?? group.recentPost.attributedTo?.displayName} · {relativeTime(group.recentPost.published)}
                </span>
              </div>
            )}

          </li>
        ))}
      </ul>
    </div>
  )
}
