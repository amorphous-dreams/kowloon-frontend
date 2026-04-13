// ProfilePage — edit current user's profile and preferences.
// Sections: Avatar, Identity, Bio/Links, Preferences, Account (read-only).

import { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Upload, Plus, X, Check } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import CircleSelector from '../components/circles/CircleSelector'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import { setActiveTheme } from '../features/theme/themeSlice'
import { patchUser } from '../features/auth/authSlice'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

// ── Mock user (fallback when not auth'd in dev) ───────────────────────────────

const MOCK_USER = {
  id: '@jzellis@kwln.org',
  username: 'jzellis',
  displayName: 'Joshua Ellis',
  profile: {
    name: 'Joshua Ellis',
    description: 'Writer, musician, technologist. Making things on the internet since 1994. Currently building Kowloon.',
    icon: 'https://picsum.photos/seed/jzellis/400/400',
    urls: ['https://jzellis.com', 'https://github.com/jzellis'],
    pronouns: 'he/him',
  },
  preferences: {
    defaultPostTypes: ['Note', 'Article'],
  },
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4 pb-8 border-b border-base-300 last:border-b-0">
      <h2 className="font-display text-2xl tracking-wide">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">{label}</label>
      {children}
      {hint && <p className="font-reading text-xs text-base-content/40 italic">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', readOnly = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border-2 font-ui text-sm tracking-wide outline-none transition-colors ${
        readOnly
          ? 'bg-base-200 border-base-300 text-base-content/50 cursor-default'
          : 'bg-base-100 border-base-300 focus:border-primary text-base-content placeholder:text-base-content/30'
      }`}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ── Theme swatch card ─────────────────────────────────────────────────────────

function ThemeCard({ theme, isActive, onSelect }) {
  const isSystem = theme.colorScheme === 'system'
  const swatchKeys = ['base-100', 'primary', 'secondary', 'accent', 'neutral']

  return (
    <button
      type="button"
      onClick={() => onSelect(theme.id)}
      className={`flex flex-col gap-2 p-3 border-2 text-left transition-colors ${
        isActive ? 'border-primary' : 'border-base-300 hover:border-base-content/30'
      }`}
      aria-pressed={isActive}
    >
      {/* Color swatches */}
      <div className="flex gap-1 h-8">
        {isSystem ? (
          // Split card: left half light, right half dark
          <>
            <div className="flex-1 flex gap-0.5">
              {['oklch(96% 0.018 85deg)', 'oklch(63% 0.1 228deg)', 'oklch(42% 0.13 265deg)'].map((c, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex-1 flex gap-0.5">
              {['oklch(12% 0.02 265deg)', 'oklch(63% 0.1 228deg)', 'oklch(28% 0.14 265deg)'].map((c, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
              ))}
            </div>
          </>
        ) : (
          swatchKeys.map((key) => (
            <div
              key={key}
              className="flex-1 h-full border border-black/10"
              style={{ backgroundColor: theme.colors?.[key] ?? 'transparent' }}
            />
          ))
        )}
      </div>

      {/* Name + active indicator */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/70 truncate">
          {theme.name}
        </span>
        {isActive && <Check size={11} className="text-primary shrink-0" />}
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const authUser = useSelector((state) => state.auth.user)
  const { serverUrl } = useSelector((state) => state.auth)
  const { available: availableThemes, activeId: activeThemeId } = useSelector((state) => state.theme)
  const dispatch = useDispatch()
  const client = useClient()
  const { t } = useTranslation()

  const user = authUser ?? MOCK_USER

  const fileInputRef = useRef(null)

  // Profile fields
  const [displayName, setDisplayName] = useState(user.profile?.name ?? user.displayName ?? '')
  const [pronouns, setPronouns]       = useState(user.profile?.pronouns ?? '')
  const [bio, setBio]                 = useState(user.profile?.description ?? '')
  const [urls, setUrls]               = useState(user.profile?.urls ?? [])
  const [newUrl, setNewUrl]           = useState('')
  const [iconUrl, setIconUrl]         = useState(user.profile?.icon ?? '')
  const [iconPreview, setIconPreview] = useState(user.profile?.icon ?? '')

  // Preferences
  const [defaultTypes, setDefaultTypes] = useState(user.preferences?.defaultPostTypes ?? [])

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState(null)

  const handleIconFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIconPreview(URL.createObjectURL(file))
    try {
      const res = await client.files.upload({
        file,
        filename: file.name,
        contentType: file.type,
        to: '@public',
      })
      if (res?.file?.url) setIconUrl(res.file.url)
    } catch {
      // Preview stays; save will use previous iconUrl if upload failed
    }
  }

  const addUrl = () => {
    const trimmed = newUrl.trim()
    if (trimmed && !urls.includes(trimmed)) setUrls([...urls, trimmed])
    setNewUrl('')
  }

  const removeUrl = (url) => setUrls(urls.filter((u) => u !== url))

  const toggleDefaultType = (type) => {
    setDefaultTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleThemeSelect = (themeId) => {
    dispatch(setActiveTheme(themeId))
    // Persist to backend silently — non-blocking
    if (client) {
      client.activities.updateProfile({ prefs: { theme: themeId } }).catch(() => {})
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await client.activities.updateProfile({
        profile: {
          name: displayName,
          description: bio,
          icon: iconUrl,
          urls,
          pronouns,
        },
        prefs: { defaultPostTypes: defaultTypes },
      })
      // Update Redux store so header/avatar refresh immediately
      const profilePatch = { name: displayName, description: bio, icon: iconUrl, urls, pronouns }
      dispatch(patchUser({ profile: profilePatch }))
      // Keep client's cached user in sync so actor fields stay fresh
      if (client.auth._user) {
        client.auth._user = {
          ...client.auth._user,
          profile: { ...client.auth._user.profile, ...profilePatch },
        }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Page header */}
      <div className="border-b-2 border-base-300 pb-4">
        <h1 className="font-display text-5xl tracking-wide leading-none">
          {t('profile.title', { defaultValue: 'Profile & Settings' })}
        </h1>
      </div>

      {/* Avatar */}
      <Section title={t('profile.avatar', { defaultValue: 'Avatar' })}>
        <div className="flex items-center gap-6">
          <div
            className="w-20 h-20 shrink-0 bg-primary cursor-pointer hover:opacity-80 transition-opacity"
            style={hexMask}
            onClick={() => fileInputRef.current?.click()}
          >
            {iconPreview && (
              <img src={iconPreview} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border-2 border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors self-start"
            >
              <Upload size={13} />
              {t('profile.uploadAvatar', { defaultValue: 'Upload image' })}
            </button>
            <p className="font-reading text-xs text-base-content/40 italic">
              {t('profile.avatarHint', { defaultValue: 'Square images work best. Will be cropped to a hexagon.' })}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleIconFile}
          />
        </div>
      </Section>

      {/* Identity */}
      <Section title={t('profile.identity', { defaultValue: 'Identity' })}>
        <Field label={t('profile.displayName', { defaultValue: 'Display name' })}>
          <TextInput value={displayName} onChange={setDisplayName} placeholder={t('profile.displayNamePlaceholder', { defaultValue: 'Your name' })} />
        </Field>
        <Field label={t('profile.pronouns', { defaultValue: 'Pronouns (optional)' })}>
          <TextInput value={pronouns} onChange={setPronouns} placeholder="e.g. they/them" />
        </Field>
        <Field label={t('profile.bio', { defaultValue: 'Bio' })}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('profile.bioPlaceholder', { defaultValue: 'A little about yourself…' })}
            rows={4}
            className="w-full px-4 py-3 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-reading text-sm text-base-content placeholder:text-base-content/30 resize-none transition-colors"
          />
        </Field>
      </Section>

      {/* Links */}
      <Section title={t('profile.links', { defaultValue: 'Links' })}>
        <div className="flex flex-col gap-2">
          {urls.map((url) => {
            let display = url
            try { display = new URL(url).hostname.replace(/^www\./, '') } catch {}
            return (
              <div key={url} className="flex items-center gap-2 px-4 py-2.5 bg-base-200 border border-base-300">
                <span className="font-ui text-xs uppercase tracking-widest text-base-content/80 flex-1 truncate">{display}</span>
                <span className="font-reading text-xs text-base-content/40 truncate flex-1 hidden sm:block">{url}</span>
                <button
                  type="button"
                  onClick={() => removeUrl(url)}
                  className="p-1 text-base-content/30 hover:text-error transition-colors shrink-0"
                  aria-label={`Remove ${url}`}
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
              placeholder="https://…"
              className="flex-1 px-4 py-2.5 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-ui text-sm text-base-content placeholder:text-base-content/30 transition-colors"
            />
            <button
              type="button"
              onClick={addUrl}
              disabled={!newUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={13} />
              {t('common.add', { defaultValue: 'Add' })}
            </button>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      {availableThemes.length > 0 && (
        <Section title={t('profile.appearance', { defaultValue: 'Appearance' })}>
          <Field
            label={t('profile.theme', { defaultValue: 'Theme' })}
            hint={t('profile.themeHint', { defaultValue: 'Changes apply immediately.' })}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={activeThemeId === theme.id}
                  onSelect={handleThemeSelect}
                />
              ))}
            </div>
          </Field>
        </Section>
      )}

      {/* Preferences */}
      <Section title={t('profile.preferences', { defaultValue: 'Preferences' })}>
        <Field
          label={t('profile.defaultPostTypes', { defaultValue: 'Default post type filter' })}
          hint={t('profile.defaultPostTypesHint', { defaultValue: 'When set, your feed opens with these types pre-selected.' })}
        >
          <div className="flex items-center gap-0 border border-base-300">
            {POST_TYPES.map((type) => {
              const active = defaultTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleDefaultType(type)}
                  title={type}
                  className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${
                    active
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-100 text-base-content/60 hover:bg-base-200'
                  }`}
                >
                  <PostTypeIcon type={type} size="sm" />
                  <span className="hidden sm:inline">{type}</span>
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      {/* Account (read-only) */}
      <Section title={t('profile.account', { defaultValue: 'Account' })}>
        <Field label={t('profile.handle', { defaultValue: 'Handle' })} hint={t('profile.handleHint', { defaultValue: 'Your full federated ID — cannot be changed.' })}>
          <TextInput value={user.id} readOnly />
        </Field>
        <Field label={t('profile.server', { defaultValue: 'Server' })} hint={t('profile.serverHint', { defaultValue: 'The server this account lives on.' })}>
          <TextInput value={serverUrl ?? '(local)'} readOnly />
        </Field>
      </Section>

      {/* Save */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t-2 border-base-300">
        {error && (
          <span role="alert" className="font-ui text-xs uppercase tracking-widest text-error">
            {error}
          </span>
        )}
        {saved && (
          <span className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-success">
            <Check size={13} />
            {t('common.saved', { defaultValue: 'Saved' })}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving
            ? t('common.saving', { defaultValue: 'Saving…' })
            : t('common.save', { defaultValue: 'Save' })
          }
        </button>
      </div>

    </div>
  )
}
