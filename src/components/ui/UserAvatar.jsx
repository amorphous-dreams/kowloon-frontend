// UserAvatar — user icon with initial fallback.
// Square, no rounding, consistent sizing. Enforces design system geometry.
// Props: user object, size (sm | md | lg)

import { useState } from 'react'
import { useSelector } from 'react-redux'

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
  const icon = isCurrentUser ? (authUser.profile?.icon ?? user?.icon) : user?.icon

  const mask = {
    WebkitMaskImage: 'url(/hex-mask.svg)',
    maskImage: 'url(/hex-mask.svg)',
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
  }

  const displayName = user?.name ?? user?.username ?? null
  const handle      = user?.id ?? null
  const tooltip     = [displayName, handle].filter(Boolean).join(' — ')

  return (
    <div
      className={`${sizes[size]} bg-primary flex items-center justify-center shrink-0`}
      style={mask}
      title={tooltip || undefined}
      aria-label={tooltip || undefined}
    >
      {icon && !imgError
        ? <img src={icon} alt={tooltip || user?.username} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        : <span className="font-display text-primary-content">{initial}</span>
      }
    </div>
  )
}
