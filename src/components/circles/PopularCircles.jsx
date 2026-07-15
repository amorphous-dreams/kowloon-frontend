// PopularCircles — sidebar list of popular/featured circles.
// Fetches from /circles sorted by reacts.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CircleIcon from '../ui/CircleIcon'
import { useClient } from '../../hooks/useClient'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

function CircleAvatar({ circle }) {
  if (circle.icon) {
    return (
      <img
        src={circle.icon}
        alt={circle.name}
        className="w-9 h-9 object-cover shrink-0 bg-base-300"
        style={hexMask}
      />
    )
  }
  return (
    <div className="w-9 h-9 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
      <CircleIcon type="circle" size="lg" className="opacity-70 text-secondary-content" />
    </div>
  )
}

export default function PopularCircles() {
  const client = useClient()
  const { t } = useTranslation()
  const [circles, setCircles] = useState([])

  useEffect(() => {
    if (!client) return
    client.feeds.getCircles({ sort: 'reacts', limit: 5 })
      .then((res) => setCircles(res?.orderedItems ?? []))
      .catch(() => {})
  }, [client])

  if (!circles.length) return null

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 mb-3" style={{ minHeight: '36px' }}>
        <CircleIcon type="circle" size="lg" className="opacity-50 !w-11 !h-11" />
        <h3 className="font-display text-3xl tracking-wide text-base-content leading-none">{t('sidebar.popularCircles')}</h3>
      </div>
      <ul className="flex flex-col gap-0">
        {circles.map((circle) => (
          <li key={circle.id} className="border-b border-base-300 last:border-b-0 mb-3 last:mb-0">
            <Link to={`/circles/${encodeURIComponent(circle.id)}`} className="flex flex-col gap-2 py-4 px-3 -mx-3 hover:bg-base-300 transition-colors">
              <div className="flex items-start gap-2">
                <div className="w-11 flex items-center justify-center self-start shrink-0" style={{ minHeight: '36px' }}>
                  <CircleAvatar circle={circle} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center" style={{ minHeight: '36px' }}>
                    <span className="font-display text-xl leading-none tracking-wide">{circle.name}</span>
                  </div>
                  {(circle.actor || circle.actorId) && (
                    <div className="flex items-center gap-1 font-ui text-xs uppercase tracking-widest text-base-content/75">
                      <span className="font-bold">{circle.actor?.name ?? circle.actorId}</span>
                      {circle.memberCount > 0 && (
                        <><span>|</span><span>{circle.memberCount} members</span></>
                      )}
                    </div>
                  )}
                  {circle.summary && (
                    <p className="font-ui text-base text-base-content/75 leading-relaxed line-clamp-2 mt-1">
                      {circle.summary}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
