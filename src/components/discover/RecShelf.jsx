// RecShelf — one Discover shelf: a section title/blurb over a horizontally
// scrolling row of RecCards. Web counterpart of the mobile RecShelf.

import RecCard from './RecCard'

export default function RecShelf({ section }) {
  if (!section?.items?.length) return null
  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="font-display text-2xl tracking-wide leading-tight">{section.name}</h2>
        {section.summary && (
          <p className="font-ui text-xs text-base-content/55 mt-0.5 line-clamp-2">{section.summary}</p>
        )}
      </div>
      {/* Horizontal shelf — scrolls within its own track, never the page body. */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {section.items.map((item, i) => (
          <RecCard key={`${item.id}:${i}`} item={item} />
        ))}
      </div>
    </div>
  )
}
