// VisibilityIcon — hex-bordered glyph showing post audience scope.
// Three states: public (globe), server (server stack), audience (circle of members).
// Tooltip + aria-label explain what each scope means.

import { useTranslation } from 'react-i18next'

import PublicIcon   from '../../assets/icons/visibility-public.svg?react'
import ServerIcon   from '../../assets/icons/visibility-server.svg?react'
import AudienceIcon from '../../assets/icons/visibility-circle.svg?react'

const ICONS = {
  public:   PublicIcon,
  server:   ServerIcon,
  audience: AudienceIcon,
}

const SIZES = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
}

function normalize(visibility) {
  if (!visibility) return 'public'
  const v = String(visibility).toLowerCase()
  if (v === 'public') return 'public'
  if (v === 'server') return 'server'
  return 'audience'
}

export default function VisibilityIcon({ visibility, size = 'sm' }) {
  const { t } = useTranslation()
  const scope = normalize(visibility)
  const Icon  = ICONS[scope]

  const label   = t(`visibility.${scope}.label`,   { defaultValue: scope.charAt(0).toUpperCase() + scope.slice(1) })
  const tooltip = t(`visibility.${scope}.tooltip`, {
    defaultValue:
      scope === 'public'   ? 'Public — anyone, on any server, can see this post.' :
      scope === 'server'   ? 'Server — only members of this server can see this post.' :
                             'Circle — only people in the addressed circle can see this post.'
  })

  return (
    <span
      className={`${SIZES[size]} shrink-0 flex items-center justify-center text-base-content/40 hover:text-base-content/80 transition-colors`}
      role="img"
      aria-label={`${label}: ${tooltip}`}
      title={tooltip}
    >
      <Icon className={SIZES[size]} />
    </span>
  )
}
