// UserAvatar — user icon with initial fallback.
// Square, no rounding, consistent sizing. Enforces design system geometry.
// Props: user object, size (sm | md | lg)

import { useState } from 'react'
import { useSelector } from 'react-redux'
import sizedUrl from '../../lib/sizedUrl'

// sm/md → 200px thumb (28-40px rendered), lg → 400px (64px rendered, but
// retina-friendly).
const THUMB_SIZE = { sm: 200, md: 200, lg: 400 }

export default function UserAvatar({ user, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }
  const initial = user?.username?.[0]?.toUpperCase() ?? '?'
  const [imgError, setImgError] = useState(false)

  // When the post author is the current user, prefer their live profile icon
  // over the stale icon baked into the post at creation time.
  // IDs can be "@user@domain" (Kowloon) or "https://domain/users/user" (AP) — compare by username.
  const authUser = useSelector((state) => state.auth.user)
  const extractUsername = (id) => {
    if (!id) return null
    if (id.startsWith('@')) return id.split('@')[1]
    try { return new URL(id).pathname.split('/').filter(Boolean).pop() } catch { return null }
  }
  const isCurrentUser = !!user?.id && !!authUser?.id &&
    extractUsername(user.id) === extractUsername(authUser.id)
  const icon = isCurrentUser
    ? (authUser.profile?.icon ?? user?.profile?.icon ?? user?.icon)
    : (user?.profile?.icon ?? user?.icon)

  const displayName = user?.name ?? user?.username ?? null
  const handle      = user?.id ?? null
  const tooltip     = [displayName, handle].filter(Boolean).join(' — ')

  // User avatars are circular (universal "person" convention).
  // Circles and Groups still use the hex mask elsewhere as the brand mark.
  return (
    <div
      className={`${sizes[size]} shrink-0 rounded-full overflow-hidden bg-primary flex items-center justify-center`}
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.18)' }}
      title={tooltip || undefined}
      aria-label={tooltip || undefined}
    >
      {icon && !imgError
        ? <img loading="lazy" src={sizedUrl(icon, THUMB_SIZE[size])} alt={tooltip || user?.username} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        : <span className="font-display text-primary-content">{initial}</span>
      }
    </div>
  )
}
