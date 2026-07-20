// TypographyProvider — holds the active user's reading-typography prefs and
// applies them as CSS custom properties on the document root, so every
// reading surface (see `.reading-surface` in index.css) follows the user's
// choices. Mirrors the mobile app's TypographyContext.
//
// Redux (state.auth.user.prefs.typography) is the single source of truth:
// changes patch the store optimistically for instant feedback, then sync to
// the server (debounced) via @kowloon/client. When logged out, defaults apply
// and nothing syncs.

import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useClient } from '../hooks/useClient'
import { patchUser } from '../features/auth/authSlice'
import {
  DEFAULT_TYPOGRAPHY,
  normalizeTypography,
  resolveTypography,
  typographyCssVars,
} from './typography'

const SYNC_DEBOUNCE_MS = 500
const TypographyContext = createContext(null)

export function TypographyProvider({ children }) {
  const user = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const client = useClient()

  const typography = useMemo(
    () => normalizeTypography(user?.prefs?.typography),
    [user?.prefs?.typography],
  )

  // Apply CSS custom properties to :root whenever the resolved prefs change.
  useEffect(() => {
    const root = document.documentElement
    const vars = typographyCssVars(typography)
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  }, [typography])

  // Debounced server sync. The server's Update handler replaces the whole
  // prefs.typography subdocument, so we always send the complete object.
  const syncTimer = useRef(null)
  const pendingRef = useRef(null)

  const value = useMemo(() => {
    function setTypography(patch) {
      const next = normalizeTypography({ ...typography, ...patch })
      // Optimistic: patch the store so vars + preview update immediately.
      dispatch(patchUser({ prefs: { typography: next } }))
      if (!client || !user) return
      pendingRef.current = next
      if (syncTimer.current) clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => {
        const val = pendingRef.current
        pendingRef.current = null
        syncTimer.current = null
        if (val) {
          client.activities.updateProfile({ prefs: { typography: val } }).catch(() => {})
        }
      }, SYNC_DEBOUNCE_MS)
    }

    return {
      typography,
      resolved: resolveTypography(typography),
      setTypography,
      defaults: DEFAULT_TYPOGRAPHY,
    }
  }, [typography, client, user, dispatch])

  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  )
}

export function useTypography() {
  const ctx = useContext(TypographyContext)
  if (!ctx) throw new Error('useTypography must be used inside <TypographyProvider>')
  return ctx
}
