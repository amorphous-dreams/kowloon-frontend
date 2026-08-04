// ServerFeedIcon — the server's icon under a scrim with a public/private glyph.
// Web twin of mobile/src/components/posts/ServerFeedIcon.jsx — this is the
// "Community Posts" (whole-network) view icon: the server avatar with a white
// globe badge (variant "public"), or a lock for server-local (variant "server").

import { Globe, Lock } from 'lucide-react'
import sizedUrl from '../../lib/sizedUrl'

export default function ServerFeedIcon({ iconUrl, variant = 'public', size = 22 }) {
  const Glyph = variant === 'server' ? Lock : Globe
  const glyph = Math.round(size * 0.56)
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden bg-secondary align-middle"
      style={{ width: size, height: size }}
    >
      {iconUrl && (
        <img src={sizedUrl(iconUrl, 200)} alt="" className="w-full h-full object-cover" />
      )}
      <span className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.22)' }} />
      <span className="absolute inset-0 flex items-center justify-center">
        <Glyph size={glyph} color="#FFFFFF" strokeWidth={2} />
      </span>
    </span>
  )
}
