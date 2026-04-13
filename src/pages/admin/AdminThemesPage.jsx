// AdminThemesPage — list, create, edit, delete themes; set server default.

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Star, Check, X } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import { useDispatch } from 'react-redux'
import { fetchThemesAsync } from '../../features/theme/themeSlice'
import Spinner from '../../components/ui/Spinner'

// All DaisyUI v5 color token names (without --color- prefix)
const COLOR_TOKENS = [
  'base-100', 'base-200', 'base-300', 'base-content',
  'primary', 'primary-content',
  'secondary', 'secondary-content',
  'accent', 'accent-content',
  'neutral', 'neutral-content',
  'info', 'info-content',
  'success', 'success-content',
  'warning', 'warning-content',
  'error', 'error-content',
]

const POST_COLOR_KEYS = ['note', 'article', 'media', 'link', 'event']

const BLANK_COLORS = Object.fromEntries(COLOR_TOKENS.map((t) => [t, '']))
const BLANK_POST_COLORS = Object.fromEntries(POST_COLOR_KEYS.map((k) => [k, '#888888']))

const BLANK_THEME = {
  id: '', name: '', description: '', colorScheme: 'light',
  colors: { ...BLANK_COLORS },
  postColors: { ...BLANK_POST_COLORS },
}

// Small row of color swatches — visual fingerprint for a theme
function ThemeSwatches({ theme }) {
  if (!theme.colors) return <span className="font-ui text-xs text-base-content/40">system</span>
  const keys = ['base-100', 'primary', 'secondary', 'accent', 'base-content']
  return (
    <div className="flex gap-0.5">
      {keys.map((k) => (
        <span
          key={k}
          title={k}
          style={{ background: theme.colors[k] ?? '#888', width: 16, height: 16, display: 'inline-block', border: '1px solid rgba(0,0,0,.15)' }}
        />
      ))}
    </div>
  )
}

// Color input: text field + live swatch preview
function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="font-ui text-[10px] uppercase tracking-widest text-base-content/50">{label}</label>
      <div className="flex items-center gap-1">
        <span
          style={{ background: value || 'transparent', width: 18, height: 18, flexShrink: 0, border: '1px solid rgba(0,0,0,.2)' }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="oklch(…) or #hex"
          className="flex-1 min-w-0 border border-base-300 focus:border-primary bg-base-100 px-2 py-1 font-mono text-[11px] outline-none"
        />
      </div>
    </div>
  )
}

// Create/Edit form
function ThemeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_THEME,
    ...initial,
    colors: { ...BLANK_COLORS, ...(initial?.colors ?? {}) },
    postColors: { ...BLANK_POST_COLORS, ...(initial?.postColors ?? {}) },
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isEdit = !!initial?.id

  const setColor = (key, val) =>
    setForm((f) => ({ ...f, colors: { ...f.colors, [key]: val } }))
  const setPostColor = (key, val) =>
    setForm((f) => ({ ...f, postColors: { ...f.postColors, [key]: val } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Strip empty color strings — server ignores undefined tokens
      const colors = Object.fromEntries(Object.entries(form.colors).filter(([, v]) => v.trim()))
      const postColors = Object.fromEntries(Object.entries(form.postColors).filter(([, v]) => v.trim()))
      await onSave({ ...form, colors, postColors })
    } catch (err) {
      setError(err?.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-primary p-6 mb-6 flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl tracking-wide">{isEdit ? 'Edit Theme' : 'New Theme'}</h2>
        <button type="button" onClick={onCancel} className="p-1 text-base-content/40 hover:text-base-content transition-colors">
          <X size={16} />
        </button>
      </div>

      {error && <p className="font-ui text-xs text-error">{error}</p>}

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">ID *</label>
            <input required value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              placeholder="my-theme"
              className="border-2 border-base-300 focus:border-primary bg-base-100 px-3 py-2 font-mono text-sm outline-none" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Name *</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border-2 border-base-300 focus:border-primary bg-base-100 px-3 py-2 font-ui text-sm outline-none" />
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Description</label>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="border-2 border-base-300 focus:border-primary bg-base-100 px-3 py-2 font-ui text-sm outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Color Scheme</label>
          <div className="flex gap-0">
            {['light', 'dark', 'system'].map((s) => (
              <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, colorScheme: s }))}
                className={`px-4 py-2 font-ui text-xs uppercase tracking-widest border-r border-base-300 last:border-r-0 transition-colors ${
                  form.colorScheme === s ? 'bg-secondary text-secondary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color tokens */}
      {form.colorScheme !== 'system' && (
        <>
          <div>
            <h3 className="font-display text-lg tracking-wide border-b border-base-300 pb-1 mb-3">UI Colors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {COLOR_TOKENS.map((token) => (
                <ColorInput key={token} label={token} value={form.colors[token] ?? ''} onChange={(v) => setColor(token, v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg tracking-wide border-b border-base-300 pb-1 mb-3">Post Type Colors</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {POST_COLOR_KEYS.map((key) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <label className="font-ui text-[10px] uppercase tracking-widest text-base-content/50">{key}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={form.postColors[key] ?? '#888888'}
                      onChange={(e) => setPostColor(key, e.target.value)}
                      className="w-8 h-8 border border-base-300 p-0 cursor-pointer bg-transparent"
                    />
                    <input
                      value={form.postColors[key] ?? ''}
                      onChange={(e) => setPostColor(key, e.target.value)}
                      className="flex-1 min-w-0 border border-base-300 focus:border-primary bg-base-100 px-2 py-1 font-mono text-[11px] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest disabled:opacity-50">
          {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Theme')}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 border border-base-300 font-ui text-xs uppercase tracking-widest hover:bg-base-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminThemesPage() {
  const client = useClient()
  const dispatch = useDispatch()
  const [themes, setThemes] = useState([])
  const [defaultId, setDefaultId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [editing, setEditing] = useState(null)   // null | 'new' | theme object
  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    try {
      const res = await client.themes.list()
      setThemes(res?.themes ?? [])
      setDefaultId(res?.defaultThemeId ?? null)
    } catch (err) {
      if (err?.status === 403 || err?.statusCode === 403) setDenied(true)
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { load() }, [load])

  const handleSetDefault = async (id) => {
    setPending(id)
    try {
      await client.themes.setDefault(id)
      setDefaultId(id)
      dispatch(fetchThemesAsync()) // refresh global theme list
    } catch {}
    setPending(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this theme?')) return
    setPending(id)
    try {
      await client.themes.delete(id)
      setThemes((prev) => prev.filter((t) => t.id !== id))
    } catch {}
    setPending(null)
  }

  const handleSave = async (form) => {
    if (editing === 'new') {
      const res = await client.themes.create(form)
      setThemes((prev) => [...prev, res.theme])
    } else {
      const res = await client.themes.update(editing.id, form)
      setThemes((prev) => prev.map((t) => t.id === editing.id ? res.theme : t))
    }
    setEditing(null)
    dispatch(fetchThemesAsync())
  }

  if (denied) return (
    <div className="py-16 text-center"><p className="font-display text-3xl tracking-wide">Access Denied</p></div>
  )

  const SCHEME_BADGE = {
    light: 'bg-warning/15 text-warning',
    dark: 'bg-info/15 text-info',
    system: 'bg-base-300 text-base-content/60',
  }

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-base-300 pb-4 mb-6">
        <h1 className="font-display text-5xl tracking-wide">Themes</h1>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest"
        >
          <Plus size={13} /> New Theme
        </button>
      </div>

      {editing && (
        <ThemeForm
          initial={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? <Spinner centered /> : (
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-base-300">
              {['Preview', 'Name', 'Scheme', 'Status', ''].map((h) => (
                <th key={h} className="font-ui text-xs uppercase tracking-widest text-base-content/50 text-left pb-2 pr-4 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {themes.map((theme) => (
              <tr key={theme.id} className="border-b border-base-300 hover:bg-base-200">
                <td className="py-3 pr-4">
                  <ThemeSwatches theme={theme} />
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-ui text-sm font-medium">{theme.name}</span>
                    {theme.isBuiltIn && (
                      <span className="font-ui text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-base-300 text-base-content/50">Built-in</span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-base-content/40">{theme.id}</span>
                  {theme.description && (
                    <p className="font-ui text-xs text-base-content/50 mt-0.5 line-clamp-1">{theme.description}</p>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className={`font-ui text-xs uppercase tracking-widest px-2 py-0.5 ${SCHEME_BADGE[theme.colorScheme] ?? ''}`}>
                    {theme.colorScheme}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {defaultId === theme.id ? (
                    <span className="flex items-center gap-1 font-ui text-xs uppercase tracking-widest text-primary">
                      <Star size={11} className="fill-current" /> Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(theme.id)}
                      disabled={pending === theme.id}
                      className="font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-primary transition-colors disabled:opacity-30 flex items-center gap-1"
                    >
                      <Star size={11} /> Set Default
                    </button>
                  )}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  {!theme.isBuiltIn && (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditing(theme)}
                        disabled={pending === theme.id}
                        className="p-1 text-base-content/40 hover:text-base-content transition-colors disabled:opacity-30"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(theme.id)}
                        disabled={pending === theme.id}
                        className="p-1 text-base-content/40 hover:text-error transition-colors disabled:opacity-30"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {themes.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center font-ui text-xs uppercase tracking-widest text-base-content/40">No themes found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
