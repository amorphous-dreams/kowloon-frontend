// themeSlice — manages available themes, active theme, and CSS injection.
//
// Theme application works by inserting/updating a <style id="kowloon-active-theme">
// element in <head>. This overrides the base [data-theme="kowloon"] variables in
// index.css because the injected <style> comes later in the document.
//
// The "system" theme (colorScheme: "system") clears the injected style, letting
// index.css's @media (prefers-color-scheme: dark) override handle dark mode.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getClient } from '../../lib/client'

const STORAGE_KEY = 'kowloon_theme'
const getStoredServerUrl = () =>
  import.meta.env.VITE_SERVER_URL || localStorage.getItem('kowloon_server_url') || null

// ── CSS injection ─────────────────────────────────────────────────────────────

export function injectTheme(theme) {
  if (typeof document === 'undefined') return

  let el = document.getElementById('kowloon-active-theme')
  if (!el) {
    el = document.createElement('style')
    el.id = 'kowloon-active-theme'
    document.head.appendChild(el)
  }

  if (!theme || theme.colorScheme === 'system') {
    // Clear override — index.css @media (prefers-color-scheme: dark) takes over
    el.textContent = ''
    return
  }

  const colorVars = Object.entries(theme.colors || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `  --color-${k}: ${v};`)
    .join('\n')

  const postColorVars = Object.entries(theme.postColors || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `  --post-color-${k}: ${v};`)
    .join('\n')

  const body = [colorVars, postColorVars].filter(Boolean).join('\n')

  // Targeting [data-theme="kowloon"] which is on <html>, so this rule has
  // the same specificity as index.css but comes later — it wins.
  el.textContent = `[data-theme="kowloon"] {\n  color-scheme: ${theme.colorScheme};\n${body}\n}`
}

// ── Async thunk ───────────────────────────────────────────────────────────────

export const fetchThemesAsync = createAsyncThunk(
  'theme/fetchThemes',
  async (_, { rejectWithValue }) => {
    try {
      const serverUrl = getStoredServerUrl()
      if (!serverUrl) return rejectWithValue('No server URL')
      const client = getClient(serverUrl)
      return await client.themes.list()
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

// ── Fallback themes (shown before server responds or if fetch fails) ──────────

const FALLBACK_THEMES = [
  { id: 'system', name: 'System', colorScheme: 'system', isBuiltIn: true, colors: null, postColors: null },
  {
    id: 'kowloon-light', name: 'Kowloon Light', colorScheme: 'light', isBuiltIn: true,
    colors: {
      'base-100': 'oklch(96% 0.018 85deg)', 'base-200': 'oklch(91% 0.022 85deg)',
      'base-300': 'oklch(84% 0.028 85deg)', 'base-content': 'oklch(13% 0.008 265deg)',
      'primary': 'oklch(63% 0.1 228deg)', 'primary-content': 'oklch(97% 0.005 228deg)',
      'secondary': 'oklch(42% 0.13 265deg)', 'secondary-content': 'oklch(96% 0.018 85deg)',
      'accent': 'oklch(55% 0.22 25deg)', 'accent-content': 'oklch(97% 0.005 25deg)',
      'neutral': 'oklch(18% 0.008 265deg)', 'neutral-content': 'oklch(92% 0.01 85deg)',
      'info': 'oklch(60% 0.15 230deg)', 'info-content': 'oklch(97% 0.005 230deg)',
      'success': 'oklch(62% 0.17 145deg)', 'success-content': 'oklch(97% 0.005 145deg)',
      'warning': 'oklch(78% 0.19 88deg)', 'warning-content': 'oklch(13% 0.008 265deg)',
      'error': 'oklch(55% 0.22 25deg)', 'error-content': 'oklch(97% 0.005 25deg)',
    },
    postColors: { note: '#b76c00', article: '#006893', media: '#009084', link: '#417843', event: '#cc272e' },
  },
  {
    id: 'kowloon-dark', name: 'Kowloon Dark', colorScheme: 'dark', isBuiltIn: true,
    colors: {
      'base-100': 'oklch(12% 0.02 265deg)', 'base-200': 'oklch(17% 0.02 265deg)',
      'base-300': 'oklch(24% 0.02 265deg)', 'base-content': 'oklch(90% 0.018 85deg)',
      'primary': 'oklch(63% 0.1 228deg)', 'primary-content': 'oklch(97% 0.005 228deg)',
      'secondary': 'oklch(28% 0.14 265deg)', 'secondary-content': 'oklch(90% 0.018 85deg)',
      'accent': 'oklch(55% 0.22 25deg)', 'accent-content': 'oklch(97% 0.005 25deg)',
      'neutral': 'oklch(20% 0.012 265deg)', 'neutral-content': 'oklch(90% 0.018 85deg)',
      'info': 'oklch(60% 0.15 230deg)', 'info-content': 'oklch(97% 0.005 230deg)',
      'success': 'oklch(62% 0.17 145deg)', 'success-content': 'oklch(97% 0.005 145deg)',
      'warning': 'oklch(78% 0.19 88deg)', 'warning-content': 'oklch(13% 0.008 265deg)',
      'error': 'oklch(55% 0.22 25deg)', 'error-content': 'oklch(97% 0.005 25deg)',
    },
    postColors: { note: '#e8920a', article: '#2ab4e8', media: '#00c4ae', link: '#62c278', event: '#ee5566' },
  },
  {
    id: 'hc-light', name: 'High Contrast Light', colorScheme: 'light', isBuiltIn: false,
    colors: {
      'base-100': '#ffffff', 'base-200': '#f2f2f2', 'base-300': '#cccccc', 'base-content': '#000000',
      'primary': '#0057e7', 'primary-content': '#ffffff',
      'secondary': '#002b6b', 'secondary-content': '#ffffff',
      'accent': '#d62000', 'accent-content': '#ffffff',
      'neutral': '#111111', 'neutral-content': '#ffffff',
      'info': '#0050c8', 'info-content': '#ffffff',
      'success': '#006400', 'success-content': '#ffffff',
      'warning': '#7c5100', 'warning-content': '#ffffff',
      'error': '#cc0000', 'error-content': '#ffffff',
    },
    postColors: { note: '#7c5100', article: '#0050c8', media: '#006400', link: '#004d00', event: '#cc0000' },
  },
  {
    id: 'hc-dark', name: 'High Contrast Dark', colorScheme: 'dark', isBuiltIn: false,
    colors: {
      'base-100': '#000000', 'base-200': '#0f0f0f', 'base-300': '#1f1f1f', 'base-content': '#ffffff',
      'primary': '#ffd700', 'primary-content': '#000000',
      'secondary': '#141414', 'secondary-content': '#ffffff',
      'accent': '#ff5500', 'accent-content': '#000000',
      'neutral': '#111111', 'neutral-content': '#ffffff',
      'info': '#55aaff', 'info-content': '#000000',
      'success': '#44dd44', 'success-content': '#000000',
      'warning': '#ffaa00', 'warning-content': '#000000',
      'error': '#ff4444', 'error-content': '#000000',
    },
    postColors: { note: '#ffd700', article: '#55aaff', media: '#44ddcc', link: '#88ee44', event: '#ff4444' },
  },
  {
    id: 'dracula', name: 'Dracula', colorScheme: 'dark', isBuiltIn: false,
    colors: {
      'base-100': '#282a36', 'base-200': '#21222c', 'base-300': '#44475a', 'base-content': '#f8f8f2',
      'primary': '#bd93f9', 'primary-content': '#282a36',
      'secondary': '#44475a', 'secondary-content': '#f8f8f2',
      'accent': '#ff79c6', 'accent-content': '#282a36',
      'neutral': '#21222c', 'neutral-content': '#f8f8f2',
      'info': '#8be9fd', 'info-content': '#282a36',
      'success': '#50fa7b', 'success-content': '#282a36',
      'warning': '#ffb86c', 'warning-content': '#282a36',
      'error': '#ff5555', 'error-content': '#f8f8f2',
    },
    postColors: { note: '#ffb86c', article: '#8be9fd', media: '#50fa7b', link: '#f1fa8c', event: '#ff5555' },
  },
  {
    id: 'nord', name: 'Nord', colorScheme: 'dark', isBuiltIn: false,
    colors: {
      'base-100': '#2e3440', 'base-200': '#3b4252', 'base-300': '#434c5e', 'base-content': '#eceff4',
      'primary': '#88c0d0', 'primary-content': '#2e3440',
      'secondary': '#3b4252', 'secondary-content': '#eceff4',
      'accent': '#81a1c1', 'accent-content': '#2e3440',
      'neutral': '#2e3440', 'neutral-content': '#eceff4',
      'info': '#88c0d0', 'info-content': '#2e3440',
      'success': '#a3be8c', 'success-content': '#2e3440',
      'warning': '#ebcb8b', 'warning-content': '#2e3440',
      'error': '#bf616a', 'error-content': '#eceff4',
    },
    postColors: { note: '#ebcb8b', article: '#88c0d0', media: '#a3be8c', link: '#8fbcbb', event: '#bf616a' },
  },
  {
    id: 'gruvbox-dark', name: 'Gruvbox Dark', colorScheme: 'dark', isBuiltIn: false,
    colors: {
      'base-100': '#282828', 'base-200': '#3c3836', 'base-300': '#504945', 'base-content': '#ebdbb2',
      'primary': '#d79921', 'primary-content': '#282828',
      'secondary': '#3c3836', 'secondary-content': '#ebdbb2',
      'accent': '#d65d0e', 'accent-content': '#282828',
      'neutral': '#1d2021', 'neutral-content': '#ebdbb2',
      'info': '#458588', 'info-content': '#ebdbb2',
      'success': '#98971a', 'success-content': '#ebdbb2',
      'warning': '#d79921', 'warning-content': '#282828',
      'error': '#cc241d', 'error-content': '#ebdbb2',
    },
    postColors: { note: '#d79921', article: '#83a598', media: '#8ec07c', link: '#98971a', event: '#fb4934' },
  },
  {
    id: 'monokai', name: 'Monokai', colorScheme: 'dark', isBuiltIn: false,
    colors: {
      'base-100': '#272822', 'base-200': '#3e3d32', 'base-300': '#75715e', 'base-content': '#f8f8f2',
      'primary': '#a6e22e', 'primary-content': '#272822',
      'secondary': '#3e3d32', 'secondary-content': '#f8f8f2',
      'accent': '#f92672', 'accent-content': '#f8f8f2',
      'neutral': '#1e1f1c', 'neutral-content': '#f8f8f2',
      'info': '#66d9e8', 'info-content': '#272822',
      'success': '#a6e22e', 'success-content': '#272822',
      'warning': '#fd971f', 'warning-content': '#272822',
      'error': '#f92672', 'error-content': '#f8f8f2',
    },
    postColors: { note: '#fd971f', article: '#66d9e8', media: '#a6e22e', link: '#e6db74', event: '#f92672' },
  },
  {
    id: 'catppuccin-mocha', name: 'Catppuccin Mocha', colorScheme: 'dark', isBuiltIn: false,
    colors: {
      'base-100': '#1e1e2e', 'base-200': '#181825', 'base-300': '#313244', 'base-content': '#cdd6f4',
      'primary': '#cba6f7', 'primary-content': '#1e1e2e',
      'secondary': '#181825', 'secondary-content': '#cdd6f4',
      'accent': '#f38ba8', 'accent-content': '#1e1e2e',
      'neutral': '#11111b', 'neutral-content': '#cdd6f4',
      'info': '#89b4fa', 'info-content': '#1e1e2e',
      'success': '#a6e3a1', 'success-content': '#1e1e2e',
      'warning': '#fab387', 'warning-content': '#1e1e2e',
      'error': '#f38ba8', 'error-content': '#1e1e2e',
    },
    postColors: { note: '#fab387', article: '#89b4fa', media: '#94e2d5', link: '#a6e3a1', event: '#f38ba8' },
  },
  {
    id: 'catppuccin-latte', name: 'Catppuccin Latte', colorScheme: 'light', isBuiltIn: false,
    colors: {
      'base-100': '#eff1f5', 'base-200': '#e6e9ef', 'base-300': '#ccd0da', 'base-content': '#4c4f69',
      'primary': '#8839ef', 'primary-content': '#eff1f5',
      'secondary': '#dce0e8', 'secondary-content': '#4c4f69',
      'accent': '#ea76cb', 'accent-content': '#eff1f5',
      'neutral': '#dce0e8', 'neutral-content': '#4c4f69',
      'info': '#1e66f5', 'info-content': '#eff1f5',
      'success': '#40a02b', 'success-content': '#eff1f5',
      'warning': '#df8e1d', 'warning-content': '#eff1f5',
      'error': '#d20f39', 'error-content': '#eff1f5',
    },
    postColors: { note: '#df8e1d', article: '#1e66f5', media: '#179299', link: '#40a02b', event: '#d20f39' },
  },
]

// ── Slice ─────────────────────────────────────────────────────────────────────

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    available: FALLBACK_THEMES,
    activeId: localStorage.getItem(STORAGE_KEY) || 'system',
    serverDefault: 'system',
    loading: false,
  },
  reducers: {
    // Set active theme by ID, persist to localStorage, inject CSS immediately.
    setActiveTheme(state, action) {
      const id = action.payload
      state.activeId = id
      localStorage.setItem(STORAGE_KEY, id)
      const theme = state.available.find((t) => t.id === id) ?? null
      injectTheme(theme)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThemesAsync.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchThemesAsync.fulfilled, (state, action) => {
        state.loading = false
        const { themes = [], defaultThemeId = 'system' } = action.payload ?? {}
        state.available = themes
        state.serverDefault = defaultThemeId

        // Determine which theme to apply:
        // 1. User's explicit localStorage choice
        // 2. Server default
        const saved = localStorage.getItem(STORAGE_KEY)
        const resolvedId = saved || defaultThemeId
        state.activeId = resolvedId

        const theme = themes.find((t) => t.id === resolvedId) ?? null
        injectTheme(theme)
      })
      .addCase(fetchThemesAsync.rejected, (state) => {
        state.loading = false
      })
  },
})

export const { setActiveTheme } = themeSlice.actions
export default themeSlice.reducer
