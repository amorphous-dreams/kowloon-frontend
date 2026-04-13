// AdminSettingsPage — view and edit server settings.

import { useState, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import Spinner from '../../components/ui/Spinner'

function isReadonly(setting) {
  return setting?.canEdit === '@private' || setting?.ui?.type === 'redacted'
}

function SettingRow({ setting, onSaved }) {
  const client = useClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(setting.value ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const readonly = isReadonly(setting)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await client.admin.updateSetting({ settingId: setting.name, value })
      onSaved(setting.name, value)
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(String(setting.value ?? ''))
    setEditing(false)
    setError(null)
  }

  const displayValue = () => {
    const v = setting.value
    if (v === null || v === undefined) return <span className="text-base-content/30">null</span>
    if (typeof v === 'boolean') return <span className={v ? 'text-success' : 'text-error'}>{String(v)}</span>
    if (typeof v === 'object') return <span className="font-mono text-xs text-base-content/60">[object]</span>
    const str = String(v)
    if (str === '[redacted]') return <span className="text-base-content/30 italic">redacted</span>
    return <span className="font-mono text-xs break-all">{str.length > 80 ? str.slice(0, 80) + '…' : str}</span>
  }

  return (
    <tr className="border-b border-base-300 group hover:bg-base-200">
      <td className="py-3 pr-4 align-top">
        <p className="font-ui text-sm font-medium">{setting.name}</p>
        {setting.description && (
          <p className="font-ui text-xs text-base-content/40 mt-0.5">{setting.description}</p>
        )}
      </td>
      <td className="py-3 pr-4 align-middle font-ui text-sm">
        {editing ? (
          <div className="flex flex-col gap-1">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="border-2 border-primary bg-base-100 px-2 py-1 font-ui text-sm outline-none w-full"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            />
            {error && <p className="font-ui text-xs text-error">{error}</p>}
          </div>
        ) : displayValue()}
      </td>
      <td className="py-3 align-middle text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button onClick={handleSave} disabled={saving}
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
