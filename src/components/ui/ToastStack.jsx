// ToastStack — single global mount that renders the current toast queue.
//
// Style follows the Kowloon editorial aesthetic: hard edges, theme tokens,
// left-edge accent bar by kind. Positioned bottom-right on desktop and
// bottom-inset full-width on mobile. Mount once in App.jsx (above the
// router so pre-auth pages get it too).

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { dismissToast } from '../../app/toastSlice'

const KIND_META = {
  success: { Icon: CheckCircle2, bar: 'border-l-success',  iconClass: 'text-success', role: 'status', aria: 'polite' },
  info:    { Icon: Info,         bar: 'border-l-primary',  iconClass: 'text-primary', role: 'status', aria: 'polite' },
  error:   { Icon: AlertCircle,  bar: 'border-l-error',    iconClass: 'text-error',   role: 'alert',  aria: 'assertive' },
}

function Toast({ toast }) {
  const dispatch = useDispatch()
  const meta = KIND_META[toast.kind] ?? KIND_META.info
  const { Icon } = meta
  const close = () => dispatch(dismissToast(toast.id))

  // Auto-dismiss after durationMs; 0 means sticky.
  useEffect(() => {
    if (!toast.durationMs) return
    const handle = setTimeout(close, toast.durationMs)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.durationMs])

  const renderAction = () => {
    if (!toast.action) return null
    const { label, to, onClick } = toast.action
    const cls = 'font-ui text-xs uppercase tracking-widest text-primary hover:opacity-70 transition-opacity shrink-0'
    if (to) return <Link to={to} onClick={close} className={cls}>{label}</Link>
    if (onClick) return (
      <button type="button" onClick={() => { onClick(); close() }} className={cls}>
        {label}
      </button>
    )
    return null
  }

  return (
    <motion.div
      role={meta.role}
      aria-live={meta.aria}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={`pointer-events-auto w-full lg:w-80 bg-base-100 border-2 border-base-300 border-l-4 ${meta.bar} shadow-lg flex items-start gap-3 px-4 py-3`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-ui text-sm text-base-content leading-snug break-words">{toast.message}</p>
        {toast.detail && (
          <p className="font-reading text-xs text-base-content/60 mt-0.5 break-words">{toast.detail}</p>
        )}
      </div>
      {renderAction()}
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="shrink-0 p-0.5 text-base-content/40 hover:text-base-content transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export default function ToastStack() {
  const items = useSelector((state) => state.toasts.items)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed z-[300] pointer-events-none flex flex-col gap-2 bottom-2 inset-x-2 items-stretch lg:bottom-4 lg:right-4 lg:left-auto lg:inset-x-auto lg:items-end lg:max-w-sm"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => <Toast key={t.id} toast={t} />)}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
