// DiscoverSection — sidebar "Discover" block with Circles and Groups sub-sections.
// Replaces the standalone PopularCircles, ActiveGroups, and PopularPosts widgets.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import CircleIcon from '../ui/CircleIcon'

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
        className="w-8 h-8 object-cover shrink-0 bg-base-300"
        style={hexMask}
      />
    )
  }
  return (
    <div className="w-8 h-8 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
      <CircleIcon type="circle" size="sm" className="opacity-70 text-secondary-content" />
    </div>
  )
}

function GroupAvatar({ group }) {
  if (group.icon) {
    return (
      <img
        src={group.icon}
        alt={group.name}
        className="w-8 h-8 object-cover shrink-0 bg-base-300"
        style={hexMask}
      />
    )
  }
  return (
    <div className="w-8 h-8 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
      <Users size={14} className="text-secondary-content opacity-70" />
    </div>
  )
}

function SubHeading({ children }) {
  return (
    <h4 className="font-ui text-xs uppercase tracking-widest text-base-content/50 pb-2 mb-1 border-b border-base-300">
      {children}
    </h4>
  )
}

function MoreLink({ to, label }) {
  return (
    <Link
      to={to}
      className="font-ui text-xs uppercase tracking-widest text-primary hover:text-primary-focus transition-colors mt-3 block"
    >
      {label}
    </Link>
  )
}

function CirclesSubSection({ circles }) {
  if (!circles.length) return null
  return (
    <div className="flex flex-col">
      <SubHeading>Circles</SubHeading>
      <ul className="flex flex-col gap-0">
        {circles.map((circle) => (
          <li key={circle.id} className="border-b border-base-300 last:border-b-0">
            <Link
              to={`/circles/${encodeURIComponent(circle.id)}`}
              className="flex items-center gap-2.5 py-3 px-2 -mx-2 hover:bg-base-300 transition-colors"
            >
              <CircleAvatar circle={circle} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-display text-lg leading-tight tracking-wide truncate">
                  {circle.name}
                </span>
                {(circle.actor || circle.actorId) && (
                  <span className="font-ui text-xs uppercase tracking-widest text-base-content/60 truncate">
                    {circle.actor?.name ?? circle.actorId}
                    {circle.memberCount > 0 && ` · ${circle.memberCount} members`}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <MoreLink to="/circles" label="More Circles…" />
    </div>
  )
}

function GroupsSubSection({ groups }) {
  if (!groups.length) return null
  return (
    <div className="flex flex-col">
      <SubHeading>Groups</SubHeading>
      <ul className="flex flex-col gap-0">
        {groups.map((group) => (
          <li key={group.id} className="border-b border-base-300 last:border-b-0">
            <Link
              to={`/groups/${encodeURIComponent(group.id)}`}
              className="flex items-center gap-2.5 py-3 px-2 -mx-2 hover:bg-base-300 transition-colors"
            >
              <GroupAvatar group={group} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-display text-lg leading-tight tracking-wide truncate">
                  {group.name}
                </span>
                {typeof group.memberCount === 'number' && (
                  <span className="font-ui text-xs uppercase tracking-widest text-base-content/60">
                    {group.memberCount.toLocaleString()} {group.memberCount === 1 ? 'member' : 'members'}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <MoreLink to="/groups" label="More Groups…" />
    </div>
  )
}

export default function DiscoverSection() {
  const client = useClient()
  const [circles, setCircles] = useState([])
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!client) return
    client.feeds.getCircles({ sort: 'reacts', limit: 5 })
      .then((res) => setCircles(res?.orderedItems ?? []))
      .catch(() => {})
    client.feeds.getGroups({ limit: 5 })
      .then((res) => setGroups(res?.orderedItems ?? []))
      .catch(() => {})
  }, [client])

  if (!circles.length && !groups.length) return null

  return (
    <div className="flex flex-col gap-0">
      <h3 className="font-display text-3xl tracking-wide text-base-content leading-none mb-5">
        Discover
      </h3>
      <div className="flex flex-col gap-6">
        <CirclesSubSection circles={circles} />
        <GroupsSubSection groups={groups} />
      </div>
    </div>
  )
}
