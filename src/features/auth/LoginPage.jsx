import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { loginAsync, clearError } from './authSlice'
import PasswordInput from '../../components/ui/PasswordInput'
import AuthSplash from '../../components/auth/AuthSplash'

const FIXED_SERVER = import.meta.env.VITE_SERVER_URL || window.KOWLOON_CONFIG?.apiUrl || window.location.origin

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
  const [searchParams] = useSearchParams()
  const { user, sessionChecked, status, error } = useSelector((state) => state.auth)
  const { t } = useTranslation()

  const [serverUrl, setServerUrl] = useState(FIXED_SERVER || '')
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')

  const successMsg = searchParams.get('verified') === 'success'
    ? 'Email verified! You can now sign in.'
    : searchParams.get('reset') === 'success'
    ? 'Password updated. Sign in with your new password.'
    : null
  // Set by the client's session-expiry handler when a token stopped working (#57).
  const expiredMsg = searchParams.get('expired') === '1'
    ? 'Your session expired. Please sign in again.'
    : null

  useEffect(() => { dispatch(clearError()) }, [dispatch])
  useEffect(() => {
    if (sessionChecked && user) navigate('/', { replace: true })
  }, [sessionChecked, user, navigate])

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
        <AuthSplash />
        {/* Scrim — the animated scene behind is colorful in both day and
            night modes; this guarantees the overlaid text stays legible
            regardless of which scene is showing. */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.45))',
        }} />

        <div className="relative z-10">
          <div className="w-12 h-1 bg-primary mb-8" />
          <p className="font-ui text-xs uppercase tracking-widest text-white/70">
            {t('app.tagline', { defaultValue: 'Your space on the open web' })}
          </p>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-9xl leading-none tracking-wide text-white">
            KOWLOON
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="font-ui text-xs uppercase tracking-widest text-white/50">kwln.org</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-reading text-sm text-white/70 leading-relaxed max-w-xs">
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

          {successMsg && (
            <div className="mb-6 px-4 py-3 border-l-4 border-success bg-success/5">
              <p className="font-ui text-xs uppercase tracking-widest text-success">{successMsg}</p>
            </div>
          )}

          {expiredMsg && !error && (
            <div className="mb-6 px-4 py-3 border-l-4 border-warning bg-warning/5">
              <p className="font-ui text-xs uppercase tracking-widest text-warning">{expiredMsg}</p>
            </div>
          )}

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

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">
                  {t('auth.password', { defaultValue: 'Password' })}
                </label>
                <Link
                  to="/forgot-password"
                  tabIndex={-1}
                  className="font-ui text-xs uppercase tracking-widest text-base-content/30 hover:text-primary transition-colors"
                >
                  {t('auth.forgotPassword', { defaultValue: 'Forgot?' })}
                </Link>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-0 py-2 bg-transparent border-b-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/25 transition-colors"
              />
            </div>

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

          <div className="mt-8 pt-6 border-t border-base-300 flex flex-col gap-3">
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
              {t('auth.noAccount', { defaultValue: "Don't have an account?" })}{' '}
              <Link to="/register" className="text-primary hover:opacity-70 transition-opacity">
                {t('auth.signUp', { defaultValue: 'Create one' })}
              </Link>
            </p>
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
              <Link to="/" className="text-primary hover:opacity-70 transition-opacity">
                {t('auth.backToHome', { defaultValue: 'Back to homepage' })}
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
