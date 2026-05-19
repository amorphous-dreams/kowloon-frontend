// toastSlice — transient on-screen notifications (success/error/info).
//
// Push toasts via the helper module at app/toast.js — callers should not
// dispatch these actions directly. Auto-dismiss timers live in <ToastStack />.
//
// Each item: {
//   id:           string          // crypto.randomUUID()
//   kind:         'success'|'error'|'info'
//   message:      string          // primary one-liner
//   detail?:      string          // optional secondary line (e.g. error.message)
//   action?:      { label, to?, onClick? }   // either a Link target or a click handler
//   durationMs:   number          // 0 = sticky (manual dismiss only)
// }

import { createSlice } from '@reduxjs/toolkit'

const MAX_VISIBLE = 5

const toastSlice = createSlice({
  name: 'toasts',
  initialState: { items: [] },
  reducers: {
    pushToast(state, action) {
      state.items.push(action.payload)
      // Drop oldest if we exceed the visible cap.
      if (state.items.length > MAX_VISIBLE) {
        state.items.splice(0, state.items.length - MAX_VISIBLE)
      }
    },
    dismissToast(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload)
    },
    clearToasts(state) {
      state.items = []
    },
  },
})

export const { pushToast, dismissToast, clearToasts } = toastSlice.actions
export default toastSlice.reducer
