import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PasswordInput from '../../components/ui/PasswordInput'

const SERVER = import.meta.env.VITE_SERVER_URL || window.KOWLOON_CONFIG?.apiUrl || window.location.origin

export default function ResetPasswordPage() {
  const [params]  = useSearchParams()
  const token     = params.get('token') ?? ''
  const navigate  = useNavigate()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const mismatch = password && confirm && password !== confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mismatch) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${SERVER}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Reset failed. The link may have expired.')
        return
      }
      navigate('/login?reset=success', { replace: true })
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-8">
          <div className="px-4 py-4 border-l-4 border-error bg-error/5">
            <p className="font-ui text-xs uppercase tracking-widest text-error">
              Invalid reset link. Please request a new one.
            </p>
          </div>
          <div className="mt-6">
            <Link to="/forgot-password" className="font-ui text-xs uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">
              Request new link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-stretch">

      <div className="hidden lg:flex lg:w-1/2 bg-secondary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, currentColor 39px, currentColor 40px)',
          color: 'var(--color-secondary-content)',
        }} />
        <div className="relative z-10">
          <div className="w-12 h-1 bg-primary mb-8" />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-9xl leading-none tracking-wide text-secondary-content">KOWLOON</h1>
        </div>
        <div />
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 bg-base-100">
        <div className="w-full max-w-sm mx-auto">

          <div className="lg:hidden mb-10">
            <h1 className="font-display text-6xl leading-none tracking-wide text-base-content">KOWLOON</h1>
            <div className="w-8 h-0.5 bg-primary mt-3" />
          </div>

          <div className="mb-8">
            <h2 className="font-display text-4xl leading-none tracking-wide text-base-content">
              New password
            </h2>
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 mt-2">
              Choose something strong
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 px-4 py-3 border-l-4 border-error bg-error/5">
              <p className="font-ui text-xs uppercase tracking-widest text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">
                New password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoFocus
                autoComplete="new-password"
                className="w-full px-0 py-2 bg-transparent border-b-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/25 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">
                  Confirm password
                </label>
                {mismatch && (
                  <span className="font-ui text-xs uppercase tracking-widest text-error">
                    Doesn't match
                  </span>
                )}
              </div>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className={`w-full px-0 py-2 bg-transparent border-b-2 outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/25 transition-colors ${
                  mismatch ? 'border-error' : 'border-base-300 focus:border-primary'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!mismatch}
              className="mt-3 w-full py-3 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-base-300">
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
              <Link to="/login" className="text-primary hover:opacity-70 transition-opacity">
                Back to sign in
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
