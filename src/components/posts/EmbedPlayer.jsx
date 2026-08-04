// EmbedPlayer — inline rich-media player for recognized providers (YouTube, …).
//
// Renders a lightweight facade (poster + play button) and only mounts the
// <iframe> on click — keeps feeds fast and avoids autoplay surprises. The
// iframe src, sandbox, and allow attributes all come from the trusted embed
// descriptor (@kowloon/client resolveEmbed), which builds them from a validated
// id — never from user-authored markup. This is the ONLY place a Link post can
// produce an iframe, and only for allowlisted providers.

import { useState } from 'react'
import { Play } from 'lucide-react'

export default function EmbedPlayer({ embed, poster, title }) {
  const [playing, setPlaying] = useState(false)
  if (!embed?.embedUrl) return null

  const ratio = embed.aspectRatio || 16 / 9
  const thumb = embed.thumbnail || poster
  const label = title || embed.title || 'Embedded media'
  const src = playing
    ? embed.embedUrl + (embed.embedUrl.includes('?') ? '&' : '?') + 'autoplay=1'
    : null

  return (
    <div className="relative w-full mb-6 bg-black overflow-hidden" style={{ aspectRatio: ratio }}>
      {playing ? (
        <iframe
          src={src}
          title={label}
          className="absolute inset-0 w-full h-full"
          allow={embed.allow}
          sandbox={embed.sandbox}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${label}`}
          className="group absolute inset-0 w-full h-full flex items-center justify-center"
        >
          {thumb && (
            <img
              src={thumb}
              alt={title ?? ''}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <span className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          <span className="relative flex items-center justify-center w-16 h-16 bg-black/70 group-hover:bg-primary transition-colors">
            <Play size={28} className="text-white translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  )
}
