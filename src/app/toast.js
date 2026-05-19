// toast — call-from-anywhere helper for the toast notification system.
//
// Usage:
//   import { toast } from '../app/toast'
//   toast.success('Circle copied', { action: { label: 'Go to new circle', to: '/circles/...' } })
//   toast.error('Failed to post reply', { detail: err.message })
//   toast.info('Saved')
//   toast.dismiss(id)
//
// Options:
//   detail        secondary text below the message (e.g. err.message)
//   action        { label, to } for a React Router link, or { label, onClick } for a button
//   durationMs    override the default auto-dismiss (success/info: 4s, error: 8s; 0 = sticky)

import { store } from './store'
import { pushToast, dismissToast, clearToasts } from './toastSlice'

const DEFAULT_DURATION = {
  success: 4000,
  info: 4000,
  error: 8000,
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function push(kind, message, opts = {}) {
  const item = {
    id: makeId(),
    kind,
    message,
    detail: opts.detail,
    action: opts.action,
    durationMs: opts.durationMs ?? DEFAULT_DURATION[kind] ?? 4000,
  }
  store.dispatch(pushToast(item))
  return item.id
}

export const toast = {
  success: (message, opts) => push('success', message, opts),
  error:   (message, opts) => push('error',   message, opts),
  info:    (message, opts) => push('info',    message, opts),
  dismiss: (id) => store.dispatch(dismissToast(id)),
  clear:   () => store.dispatch(clearToasts()),
}
