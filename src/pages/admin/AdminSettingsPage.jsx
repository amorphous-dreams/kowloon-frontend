// AdminSettingsPage — view and edit server settings.

import { useState, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import Spinner from '../../components/ui/Spinner'

function isReadonly(setting) {
  return setting?.canEdit === '@private' || setting?.ui?.type === 'redacted'
}

function toEditString(uiType, v) {
  if (uiType === 'json') return v != null ? JSON.stringify(v, null, 2) : ''
  return String(v ?? '')
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
              className="p-1 text-success hover:text-success/80 transition-colors disabled:opacity-30" title="Save">
              <Check size={14} />
            </button>
            <button onClick={handleCancel}
              className="p-1 text-base-content/40 hover:text-base-content transition-colors" title="Cancel">
              <X size={14} />
            </button>
          </div>
        ) : !readonly && (
          <button onClick={() => setEditing(true)}
            className="p-1 text-base-content/0 group-hover:text-base-content/40 hover:text-base-content transition-colors" title="Edit">
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
                  {editable.map((s) => <SettingRow key={s.name} setting={s} onSaved={handleSaved} />)}
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
                  {readonly.map((s) => <SettingRow key={s.name} setting={s} onSaved={handleSaved} />)}
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
