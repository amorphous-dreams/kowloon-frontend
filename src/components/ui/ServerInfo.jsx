// ServerInfo — server description (HTML) and location.
// Icon and name live in the header; this is the supplementary block.

import { useSelector } from 'react-redux'
import { MapPin } from 'lucide-react'

export default function ServerInfo() {
  const server   = useSelector((state) => state.server)
  const location = server.settings?.profile?.location

  if (server.status !== 'succeeded') return null
  if (!server.image && !server.description && !location?.name) return null

  return (
    <div className="flex flex-col gap-3 border-b-2 border-base-300 pb-5">
      {server.image && (
        // Negative margins escape the parent's padding so the image bleeds to
        // the sidebar's outer edges. `lg:mx-0` cancels the horizontal bleed on
        // desktop where the column has only vertical padding.
        <div className="-mt-6 -mx-6 lg:mx-0">
          <img
            src={server.image}
            alt=""
            className="w-full aspect-video object-cover"
          />
        </div>
      )}

      {server.description && (
        <div
          className="font-reading text-sm text-base-content/80 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: server.description }}
        />
      )}

      {location?.name && (
        <div className="flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-base-content/55">
          <MapPin size={14} className="shrink-0" />
          <span>{location.name}</span>
        </div>
      )}
    </div>
  )
}
