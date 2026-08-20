import { useEffect, useState } from 'react'

// Matches Tailwind's default `lg` breakpoint (1024px). For conditionally
// *mounting* content that differs between the desktop/mobile auth layouts —
// unlike a plain `hidden lg:flex` CSS toggle, this actually unmounts the
// inactive side, which matters for anything with its own effects/timers
// (e.g. AuthSplash's animation loop) that shouldn't run twice at once just
// because one copy is invisible.
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
