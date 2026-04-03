import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { loginAsync, clearError } from './authSlice'

const FIXED_SERVER = import.meta.env.VITE_SERVER_URL || ''

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">{label}</label>
        {hint && <span className="font-ui text-xs uppercase tracking-widest text-base-content/30">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, sessionChecked, status, error } = useSelector((state) => state.auth)
  const { t } = useTranslation()

  const [serverUrl, setServerUrl] = useState(FIXED_SERVER || '')
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')

  useEffect(() => { dispatch(clearError()) }, [dispatch])
  useEffect(() => { if (sessionChecked && user) navigate('/', { replace: true }) }, [sessionChecked, user, navigate])

  const isLoading = status === 'loading'

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(loginAsync({ serverUrl: serverUrl.trim(), username: username.trim(), password }))
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/40 animate-pulse">
          {t('common.loading', { defaultValue: 'Loading…' })}
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-stretch">

      {/* Left — decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary flex-col justify-between p-12 relative overflow-hidden">
        {/* Background rule lines — print texture */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, currentColor 39px, currentColor 40px)',
          color: 'var(--color-secondary-content)',
        }} />

        <div className="relative z-10">
          <div className="w-12 h-1 bg-primary mb-8" />
          <p className="font-ui text-xs uppercase tracking-widest text-secondary-content/50">
            {t('app.tagline', { defaultValue: 'Your space on the open web' })}
          </p>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-9xl leading-none tracking-wide text-secondary-content">
            KOWLOON
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-secondary-content/20" />
            <span className="font-ui text-xs uppercase tracking-widest text-secondary-content/40">kwln.org</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-reading text-sm text-secondary-content/50 leading-relaxed max-w-xs">
            {t('app.description', { defaultValue: 'An open-source, federated social platform built for people who care about what they share.' })}
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 bg-base-100">
        <div className="w-full max-w-sm mx-auto">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <h1 className="font-display text-6xl leading-none tracking-wide text-base-content">KOWLOON</h1>
            <div className="w-8 h-0.5 bg-primary mt-3" />
          </div>

          <div className="mb-8">
            <h2 className="font-display text-4xl leading-none tracking-wide text-base-content">
              {t('auth.loginTitle', { defaultValue: 'Sign In' })}
            </h2>
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 mt-2">
              {t('auth.loginSubtitle', { defaultValue: 'Welcome back' })}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 px-4 py-3 border-l-4 border-error bg-error/5">
              <p className="font-ui text-xs uppercase tracking-widest text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {!FIXED_SERVER && (
              <Field label={t('auth.serverUrl', { defaultValue: 'Server URL' })}>
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder={t('auth.serverUrlPlaceholder', { defaultValue: 'https://kwln.org' })}
                  required
                  autoComplete="url"
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/25 transition-colors"
                />
              </Field>
            )}

            <Field label={t('auth.username', { defaultValue: 'Username' })}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder', { defaultValue: 'yourhandle' })}
                required
                autoComplete="username"
                autoFocus={!!FIXED_SERVER}
                className="w-full px-0 py-2 bg-transparent border-b-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/25 transition-colors"
              />
            </Field>

            <Field label={t('auth.password', { defaultValue: 'Password' })}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-0 py-2 bg-transparent border-b-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/25 transition-colors"
              />
            </Field>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full py-3 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {isLoading
                ? t('auth.signingIn', { defaultValue: 'Signing in…' })
                : t('auth.login', { defaultValue: 'Sign In' })
              }
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-base-300">
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
              {t('auth.noAccount', { defaultValue: "Don't have an account?" })}{' '}
              <Link to="/register" className="text-primary hover:opacity-70 transition-opacity">
                {t('auth.signUp', { defaultValue: 'Create one' })}
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
