// ComposeFab — hexagon floating "new post" button, converged with the mobile
// app's compose FAB. Sticks to the bottom-right of the center feed column
// (never over the sidebars) and opens the controlled PostComposer.
//
// The hexagon motif matches CircleSelector / CircleIcon: a plum primary square
// masked through /hex-mask.svg. A drop-shadow on the wrapper follows the mask's
// alpha so the shadow is hexagonal too (box-shadow would be clipped by the mask).

import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

export default function ComposeFab({ onClick }) {
  const { t } = useTranslation()
  return (
    // Zero-height sticky row pinned to the bottom of the scrolling feed column.
    // pointer-events-none lets clicks pass through the empty track; the button
    // re-enables them. justify-end keeps it hard against the column's right edge.
    <div className="sticky bottom-6 z-30 flex justify-end pointer-events-none h-0 -mt-14">
      <div style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.28))' }}>
        <button
          type="button"
          onClick={onClick}
          aria-label={t('composer.newPost', { defaultValue: 'New post' })}
          title={t('composer.newPost', { defaultValue: 'New post' })}
          className="pointer-events-auto w-14 h-14 bg-primary text-primary-content flex items-center justify-center hover:bg-primary/90 active:bg-primary/80 transition-colors"
          style={hexMask}
        >
          <Plus size={26} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
