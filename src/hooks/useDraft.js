// useDraft — localStorage-backed draft persistence for composers.
//
// Each draft is namespaced under a caller-supplied key. Saves are debounced so
// rapid typing doesn't thrash the storage layer. Returned helpers:
//   load()   — sync read of the current draft, or null if absent / unparseable
//   save(d)  — schedule a write (~400ms debounce); pass any JSON-serializable shape
//   cancel() — drop any pending debounced write WITHOUT clearing stored draft
//              (use when state momentarily transitions through empty)
//   clear()  — remove the stored draft (on successful submit or explicit cancel)
//
// File attachments are not persisted — File objects can't be serialized to
// localStorage. Callers should only stash text/scalar state.

import { useCallback, useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'kowloon:draft:'
const SAVE_DEBOUNCE_MS = 400

function writeStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

export function useDraft(key) {
  const timerRef = useRef(null)
  const pendingRef = useRef(null)
  const storageKey = key ? STORAGE_PREFIX + key : null

  const load = useCallback(() => {
    if (!storageKey) return null
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [storageKey])

  const save = useCallback((data) => {
    if (!storageKey) return
    pendingRef.current = data
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      writeStorage(storageKey, pendingRef.current)
      pendingRef.current = null
      timerRef.current = null
    }, SAVE_DEBOUNCE_MS)
  }, [storageKey])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    pendingRef.current = null
  }, [])

  const clear = useCallback(() => {
    if (!storageKey) return
    cancel()
    try { localStorage.removeItem(storageKey) } catch {}
  }, [storageKey, cancel])

  // On unmount or key change, flush any pending debounced save so the user
  // doesn't lose the last few hundred ms of typing when they navigate away.
  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      if (pendingRef.current && storageKey) {
        writeStorage(storageKey, pendingRef.current)
        pendingRef.current = null
      }
    }
  }, [storageKey])

  return { load, save, cancel, clear }
}
