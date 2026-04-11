import { configureStore } from '@reduxjs/toolkit'
import authReducer, { restoreSessionAsync } from '../features/auth/authSlice'
import feedReducer from './feedSlice'
import serverReducer, { fetchServerInfoAsync } from './serverSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    feed: feedReducer,
    server: serverReducer,
  },
})

// Kick off session restore and server info fetch immediately so the app
// knows auth state and server name before the first render cycle completes.
store.dispatch(restoreSessionAsync())
store.dispatch(fetchServerInfoAsync())
