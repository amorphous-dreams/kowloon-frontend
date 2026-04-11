// ServerInfo — server icon, name, description, and location.
// Reads from Redux serverSlice (fetched at app startup).

import { useSelector } from 'react-redux'

export default function ServerInfo() {
  const server = useSelector((state) => state.server)

  if (server.status !== 'succeeded' || !server.name) return null

  return (
    <div className="flex flex-col gap-0 border-b-2 border-base-300 pb-5">
      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-4">
        {server.icon && (
          <img src={server.icon} alt={server.name} className="w-10 h-10 object-contain shrink-0" />
        )}
        <span className="font-display text-4xl tracking-wide text-base-content leading-none">
          {server.name}
        </span>
      </div>

      {/* Subtitle */}
      {server.subtitle && (
        <p className="font-ui text-xs uppercase tracking-widest text-base-content/55 mb-2 pl-[52px]">
          {server.subtitle}
        </p>
      )}

      {/* Description */}
      {server.description && (
        <p className="font-reading text-sm text-base-content/80 leading-relaxed pl-[52px]">
          {server.description}
        </p>
      )}
    </div>
  )
}
