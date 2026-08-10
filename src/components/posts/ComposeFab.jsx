// ComposeFab — square "new post" button with a fan-out post-type picker,
// matching the mobile app's compose FAB (src/components/nav/ComposeFab.jsx).
//
//   tap the button   → fan out the five post types (Event top … Note nearest)
//   tap a type pill  → open the composer preset to that type via onSelectType
//   tap the backdrop / the button again → collapse
//
// Sticks to the bottom-right of the center feed column (never over the sidebars)
// via a zero-height sticky track. The button is a solid plum square — NOT a
// hexagon (the hex is the motif for avatars/type icons, not the action button).

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { POST_TYPE_NAMES, POST_TYPES } from '../../lib/postTypes'
import PostTypeIcon from '../ui/PostTypeIcon'

export default function ComposeFab({ onSelectType }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // Event at the top of the stack, Note nearest the button — matches the app.
  const items = [...POST_TYPE_NAMES].reverse()

  function pick(type) {
    setOpen(false)
    onSelectType?.(type)
  }

  return (
    // Sticky row pinned to the bottom of the scrolling feed column, sized to the
    // button's own height (h-14) so it reserves real flow space instead of the
    // old h-0/-mt-14 trick — that combination was corrupting position:sticky's
    // bottom-offset math (measured: the button sat flush with main's edge, 0px
    // gap, regardless of the `bottom` value below). pointer-events-none lets
    // clicks pass through the row's empty space; the button/pills/backdrop
    // re-enable them. justify-end keeps it at the right edge.
    // bottom offset adds env(safe-area-inset-bottom) on top of the usual 24px so
    // the button clears the Android gesture bar / iOS home indicator when the
    // page is drawn edge-to-edge under it (resolves to +0 where there's no inset).
    <div
      className="sticky z-30 flex justify-end items-end pointer-events-none h-14"
      style={{
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* Click-away backdrop while the picker is open */}
      {open && (
        <button
          type="button"
          aria-label={t('composer.close', { defaultValue: 'Close' })}
          onClick={() => setOpen(false)}
          className="pointer-events-auto fixed inset-0 bg-black/30 cursor-default"
        />
      )}

      <div className="relative">
        {/* Fan-out type pills, stacked above the button */}
        {open && (
          <div className="absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2.5">
            {items.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => pick(type)}
                className="pointer-events-auto flex items-center gap-2.5 bg-base-100 border border-base-300 px-4 py-2.5 shadow-md hover:bg-base-200 transition-colors whitespace-nowrap"
              >
                <PostTypeIcon type={type} size="sm" />
                <span className="font-ui text-xs uppercase tracking-widest text-base-content">
                  {t(`postTypes.${type}`, { defaultValue: POST_TYPES[type]?.label ?? type })}
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t('composer.newPost', { defaultValue: 'New post' })}
          aria-expanded={open}
          className="pointer-events-auto w-14 h-14 bg-primary text-primary-content flex items-center justify-center shadow-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
        >
          {open ? <X size={26} strokeWidth={2} /> : <Plus size={26} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}
