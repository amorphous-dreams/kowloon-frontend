// CircleCard — circle name, description, member count, and visibility.
// Props: circle object

import { Link } from 'react-router-dom'
import VisibilityTag from '../ui/VisibilityTag'

// Circles carry `to` (audience), not a `visibility` field. Derive a display
// label from it — mirrors mobile's circleVisibilityLabel.
//   @public              → Public
//   @server / @<domain>  → Server (single '@', no user part)
//   circle:… / group:…   → scoped label
//   @user@<domain>       → Private (self-addressed owner id, "only you")
function circleVisibilityLabel(to) {
  if (!to || to === '@public') return 'Public'
  if (to === '@server') return 'Server'
  if (typeof to === 'string' && to.startsWith('circle:')) return 'Private circle'
  if (typeof to === 'string' && to.startsWith('group:')) return 'Group'
  if (typeof to === 'string' && to.startsWith('@') && to.indexOf('@', 1) === -1) return 'Server'
  return 'Private'
}

export default function CircleCard({ circle }) {
  return (
    <div className="flex flex-col gap-2 py-4 border-b border-base-300">
      <div className="flex items-center gap-2">
        <Link
          to={`/circles/${encodeURIComponent(circle?.id)}`}
          className="font-display text-2xl tracking-wide hover:text-primary transition-colors"
        >
          {circle?.name}
        </Link>
        <VisibilityTag visibility={circleVisibilityLabel(circle?.to)} />
      </div>
      {circle?.summary && (
        <p className="font-ui text-sm text-base-content/70">{circle.summary}</p>
      )}
      {circle?.memberCount != null && (
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/50">
          {circle.memberCount} members
        </span>
      )}
    </div>
  )
}
