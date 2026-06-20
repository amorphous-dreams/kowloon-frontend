// AdminSettingsPage — view and edit server settings.

import { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { Pencil, Check, ArrowUp, ArrowDown, Trash2, Plus, Upload, X } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import Spinner from '../../components/ui/Spinner'
import { fetchServerInfoAsync } from '../../app/serverSlice'
import sizedUrl from '../../lib/sizedUrl'

function isReadonly(setting) {
  return setting?.canEdit === '@private' || setting?.ui?.type === 'redacted'
}

function toEditString(uiType, v) {
  if (uiType === 'json') return v != null ? JSON.stringify(v, null, 2) : ''
  return String(v ?? '')
}

// ── Profile editor ─────────────────────────────────────────────────────────

function ImageUploadField({ label, value, onUploaded, client }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await client.files.upload({
        file,
        filename: file.name,
        contentType: file.type,
        to: '@public',
        generateThumbnail: true,
        thumbnailSizes: [200, 400],
      })
      onUploaded(result.file.url)
    } catch (err) {
      setError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-ui text-xs uppercase tracking-widest text-base-content/50">{label}</p>
      {value && (
        <div className="relative w-fit">
          <img src={sizedUrl(value, 400)} alt="" className="max-h-32 max-w-xs object-contain border border-base-300" />
          <button type="button" onClick={() => onUploaded('')}
            className="absolute top-1 right-1 bg-base-100 border border-base-300 p-0.5 text-base-content/50 hover:text-error transition-colors"
            title="Remove">
            <X size={12} />
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 w-fit px-3 py-1.5 font-ui text-xs uppercase tracking-widest border border-base-300 hover:border-primary text-base-content/60 hover:text-base-content disabled:opacity-40 transition-colors">
        <Upload size={13} />
        {uploading ? 'Uploading...' : value ? 'Replace' : 'Upload image'}
      </button>
      {error && <p className="font-ui text-xs text-error">{error}</p>}
    </div>
  )
}

function ProfileSettingRow({ setting, onSaved }) {
  const client = useClient()
  const dispatch = useDispatch()
  const initial = setting.value ?? {}
  const [form, setForm] = useState({
    name:         initial.name         ?? '',
    subtitle:     initial.subtitle     ?? '',
    description:  initial.description  ?? '',
    icon:         initial.icon         ?? '',
    image:        initial.image        ?? '',
    locationName: initial.location?.name ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [saved, setSaved]   = useState(false)

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }

  // Save with an explicit form snapshot — avoids stale closure issues when
  // called immediately after a state update (e.g. image autosave on upload).
  const doSave = async (snapshot) => {
    setSaving(true)
    setError(null)
    try {
      const value = {
        ...initial,
        name:        snapshot.name,
        subtitle:    snapshot.subtitle,
        description: snapshot.description,
        icon:        snapshot.icon,
        image:       snapshot.image,
        location: {
          ...(initial.location ?? {}),
          name: snapshot.locationName,
        },
      }
      await client.admin.updateSetting({ settingId: setting.name, value })
      onSaved(setting.name, value)
      dispatch(fetchServerInfoAsync())
      setSaved(true)
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => doSave(form)

  // Autosave immediately on image/icon upload so the user doesn't need to
  // click "Save profile" separately — images take effect right away.
  const handleImageUploaded = (field, url) => {
    const next = { ...form, [field]: url }
    setForm(next)
    setSaved(false)
    doSave(next)
  }

  return (
    <tr className="border-b border-base-300">
      <td className="py-4 align-top" colSpan={3}>
        <div className="flex flex-col gap-5 max-w-xl">
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Server name</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className="border border-base-300 focus:border-primary bg-base-100 px-3 py-2 font-ui text-sm outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Subtitle</label>
            <input type="text" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)}
              className="border border-base-300 focus:border-primary bg-base-100 px-3 py-2 font-ui text-sm outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Description (HTML)</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={4}
              className="border border-base-300 focus:border-primary bg-base-100 px-3 py-2 font-mono text-xs outline-none resize-y" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">Location name</label>
            <input type="text" value={form.locationName} onChange={(e) => set('locationName', e.target.value)}
              className="border border-base-300 focus:border-primary bg-base-100 px-3 py-2 font-ui text-sm outline-none" />
          </div>
          <ImageUploadField label="Server icon (header)" value={form.icon}
            onUploaded={(url) => handleImageUploaded('icon', url)} client={client} />
          <ImageUploadField label="Hero image (sidebar banner)" value={form.image}
            onUploaded={(url) => handleImageUploaded('image', url)} client={client} />
          <div className="flex items-center gap-3">
            {error && <span className="font-ui text-xs text-error">{error}</span>}
            {saved && !error && <span className="font-ui text-xs text-success uppercase tracking-widest">Saved</span>}
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 font-ui text-xs uppercase tracking-widest bg-primary text-primary-content hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Rules editor ───────────────────────────────────────────────────────────
// Server stores each rule as { id, text, html }. The widget only edits
// id + text; the server re-renders html on save. New rules omit id and the
// server generates one.

function newLocalRuleId() {
  return globalThis.crypto?.randomUUID?.() ?? `new-${Date.now()}-${Math.random()}`
}

function RulesEditorRow({ setting, onSaved, readonly }) {
  const client = useClient()
  const initial = Array.isArray(setting.value)
    ? setting.value.map((r) => ({ id: r.id, text: r.text ?? '' }))
    : []
  const [rules, setRules] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const dirty = JSON.stringify(rules) !== JSON.stringify(initial)

  const update = (i, text) =>
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, text } : r)))
  const move = (i, delta) =>
    setRules((prev) => {
      const j = i + delta
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const remove = (i) => setRules((prev) => prev.filter((_, idx) => idx !== i))
  const add = () => setRules((prev) => [...prev, { id: newLocalRuleId(), text: '' }])
  const revert = () => { setRules(initial); setError(null) }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = rules
        .map((r) => ({ id: r.id, text: (r.text || '').trim() }))
        .filter((r) => r.text)
      await client.admin.updateSetting({ settingId: setting.name, value: payload })
      onSaved(setting.name, payload)
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b border-base-300">
      <td className="py-3 pr-4 align-top" colSpan={3}>
        <div className="mb-3">
          <p className="font-ui text-sm font-medium">{setting.name}</p>
          {setting.description && (
            <p className="font-ui text-xs text-base-content/40 mt-0.5">{setting.description}</p>
          )}
        </div>
        {rules.length === 0 && (
          <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 mb-3">
            No rules set. New users won't see any acknowledgement step.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {rules.map((rule, i) => (
            <li key={rule.id} className="flex items-start gap-2 border border-base-300 bg-base-100 p-2">
              <span className="font-ui text-xs uppercase tracking-widest text-base-content/40 mt-2 w-6 text-right tabular-nums shrink-0">
                {i + 1}
              </span>
              <textarea
                value={rule.text}
                onChange={(e) => update(i, e.target.value)}
                placeholder="Markdown supported — links, emphasis, lists."
                rows={2}
                disabled={readonly || saving}
                className="flex-1 bg-base-100 border border-base-300 focus:border-primary outline-none px-2 py-1 font-reading text-sm resize-y"
              />
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={readonly || saving || i === 0}
                  className="p-1 text-base-content/40 hover:text-base-content disabled:opacity-20" title="Move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={readonly || saving || i === rules.length - 1}
                  className="p-1 text-base-content/40 hover:text-base-content disabled:opacity-20" title="Move down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => remove(i)} disabled={readonly || saving}
                  className="p-1 text-base-content/40 hover:text-error disabled:opacity-20" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between mt-3 gap-3">
          <button type="button" onClick={add} disabled={readonly || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:text-base-content border border-base-300 hover:border-primary transition-colors disabled:opacity-40">
            <Plus size={13} /> Add rule
          </button>
          <div className="flex items-center gap-2">
            {error && <span className="font-ui text-xs text-error">{error}</span>}
            {dirty && (
              <button type="button" onClick={revert} disabled={saving}
                className="px-3 py-1.5 font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors">
                Revert
              </button>
            )}
            <button type="button" onClick={save} disabled={readonly || saving || !dirty}
              className="px-4 py-1.5 font-ui text-xs uppercase tracking-widest bg-primary text-primary-content hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

function SettingRow({ setting, onSaved }) {
  const client = useClient()
  const uiType = setting.ui?.type ?? 'text'
  const readonly = isReadonly(setting)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(() => toEditString(uiType, setting.value))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async (override) => {
    setSaving(true)
    setError(null)
    let coerced
    try {
      if (override !== undefined) {
        coerced = override
      } else if (uiType === 'json') {
        coerced = JSON.parse(value)
      } else if (uiType === 'number') {
        coerced = Number(value)
      } else {
        coerced = value
      }
    } catch {
      setError('Invalid JSON')
      setSaving(false)
      return
    }
    try {
      await client.admin.updateSetting({ settingId: setting.name, value: coerced })
      onSaved(setting.name, coerced)
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(toEditString(uiType, setting.value))
    setEditing(false)
    setError(null)
  }

  if (uiType === 'boolean') {
    const checked = Boolean(setting.value)
    return (
      <tr className="border-b border-base-300 hover:bg-base-200">
        <td className="py-3 pr-4 align-middle">
          <p className="font-ui text-sm font-medium">{setting.name}</p>
          {setting.description && (
            <p className="font-ui text-xs text-base-content/40 mt-0.5">{setting.description}</p>
          )}
        </td>
        <td className="py-3 pr-4 align-middle" colSpan={2}>
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <input type="checkbox" checked={checked} disabled={readonly || saving}
              className="cursor-pointer"
              onChange={() => handleSave(!checked)} />
            <span className={`font-ui text-xs uppercase tracking-widest ${checked ? 'text-success' : 'text-base-content/40'}`}>
              {checked ? 'Enabled' : 'Disabled'}
            </span>
          </label>
          {error && <p className="font-ui text-xs text-error mt-1">{error}</p>}
        </td>
      </tr>
    )
  }

  const displayValue = () => {
    const v = setting.value
    if (v === null || v === undefined) return <span className="text-base-content/30">null</span>
    if (typeof v === 'object') {
      const str = JSON.stringify(v)
      return <span className="font-mono text-xs text-base-content/60 break-all">{str.length > 80 ? str.slice(0, 80) + '…' : str}</span>
    }
    const str = String(v)
    if (str === '[redacted]') return <span className="text-base-content/30 italic">redacted</span>
    return <span className="font-mono text-xs break-all">{str.length > 80 ? str.slice(0, 80) + '…' : str}</span>
  }

  const renderInput = () => {
    if (uiType === 'json' || uiType === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={uiType === 'json' ? 8 : 4}
          className="border-2 border-primary bg-base-100 px-2 py-1 font-mono text-xs outline-none w-full resize-y"
          autoFocus
        />
      )
    }
    const inputType = ['email', 'url', 'number'].includes(uiType) ? uiType : 'text'
    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border-2 border-primary bg-base-100 px-2 py-1 font-ui text-sm outline-none w-full"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
      />
    )
  }

  return (
    <tr className="border-b border-base-300 group hover:bg-base-200">
      <td className="py-3 pr-4 align-top">
        <p className="font-ui text-sm font-medium">{setting.name}</p>
        {setting.description && (
          <p className="font-ui text-xs text-base-content/40 mt-0.5">{setting.description}</p>
        )}
      </td>
      <td className={`py-3 pr-4 align-middle font-ui text-sm ${!editing && !readonly ? 'cursor-pointer' : ''}`}
        onClick={!editing && !readonly ? () => setEditing(true) : undefined}>
        {editing ? (
          <div className="flex flex-col gap-1">
            {renderInput()}
            {error && <p className="font-ui text-xs text-error">{error}</p>}
          </div>
        ) : displayValue()}
      </td>
      <td className="py-3 align-top text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button onClick={() => handleSave()} disabled={saving}
              className="px-2 py-1 font-ui text-xs uppercase tracking-widest bg-primary text-primary-content hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleCancel}
              className="px-2 py-1 font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content border border-base-300 transition-colors">
              Cancel
            </button>
          </div>
        ) : !readonly && (
          <button onClick={() => setEditing(true)}
            className="p-1 text-base-content/20 group-hover:text-base-content/60 hover:text-base-content transition-colors" title="Edit">
            <Pencil size={13} />
          </button>
        )}
      </td>
    </tr>
  )
}

export default function AdminSettingsPage() {
  const client = useClient()
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!client) return
    client.admin.getSettings()
      .then((res) => setSettings(res?.settings ?? []))
      .catch((err) => {
        if (err?.status === 403 || err?.statusCode === 403) setDenied(true)
      })
      .finally(() => setLoading(false))
  }, [client])

  const handleSaved = (name, value) => {
    setSettings((prev) => prev.map((s) => s.name === name ? { ...s, value } : s))
  }

  if (denied) return (
    <div className="py-16 text-center"><p className="font-display text-3xl tracking-wide">Access Denied</p></div>
  )

  const filtered = search.trim()
    ? settings.filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    : settings

  const editable = filtered.filter((s) => !isReadonly(s))
  const readonly = filtered.filter((s) => isReadonly(s))

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-base-300 pb-4 mb-6">
        <h1 className="font-display text-5xl tracking-wide">Settings</h1>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/40">{settings.length} total</span>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter settings…"
        className="w-full border-2 border-base-300 focus:border-primary bg-base-100 px-4 py-2 font-ui text-sm outline-none mb-6"
      />

      {loading ? <Spinner centered /> : (
        <>
          {editable.length > 0 && (
            <>
              <h2 className="font-display text-2xl tracking-wide border-b-2 border-base-300 pb-2 mb-0">Editable</h2>
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b border-base-300">
                    <th className="font-ui text-xs uppercase tracking-widest text-base-content/50 text-left py-2 pr-4 w-48">Name</th>
                    <th className="font-ui text-xs uppercase tracking-widest text-base-content/50 text-left py-2 pr-4">Value</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {editable.map((s) =>
                    s.name === 'profile'
                      ? <ProfileSettingRow key={s.name} setting={s} onSaved={handleSaved} />
                      : s.ui?.type === 'rules'
                      ? <RulesEditorRow key={s.name} setting={s} onSaved={handleSaved} readonly={isReadonly(s)} />
                      : <SettingRow key={s.name} setting={s} onSaved={handleSaved} />
                  )}
                </tbody>
              </table>
            </>
          )}

          {readonly.length > 0 && (
            <>
              <h2 className="font-display text-2xl tracking-wide border-b-2 border-base-300 pb-2 mb-0 text-base-content/50">Read-only</h2>
              <table className="w-full opacity-60">
                <thead>
                  <tr className="border-b border-base-300">
                    <th className="font-ui text-xs uppercase tracking-widest text-base-content/50 text-left py-2 pr-4 w-48">Name</th>
                    <th className="font-ui text-xs uppercase tracking-widest text-base-content/50 text-left py-2 pr-4">Value</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {readonly.map((s) =>
                    s.ui?.type === 'rules'
                      ? <RulesEditorRow key={s.name} setting={s} onSaved={handleSaved} readonly={isReadonly(s)} />
                      : <SettingRow key={s.name} setting={s} onSaved={handleSaved} />
                  )}
                </tbody>
              </table>
            </>
          )}

          {filtered.length === 0 && (
            <p className="py-8 text-center font-ui text-xs uppercase tracking-widest text-base-content/40">No settings match.</p>
          )}
        </>
      )}
    </div>
  )
}
