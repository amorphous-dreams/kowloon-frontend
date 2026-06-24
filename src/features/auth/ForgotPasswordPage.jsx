import { useState } from 'react'
import { Link } from 'react-router-dom'

const SERVER = import.meta.env.VITE_SERVER_URL || window.KOWLOON_CONFIG?.apiUrl || window.location.origin

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${SERVER}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
    } catch {
      // Intentionally swallowed — server returns 200 regardless to
      // prevent email enumeration; we show the same message either way.
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-stretch">

      {/* Left decorative panel */}
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

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 bg-base-100">
        <div className="w-full max-w-sm mx-auto">

          <div className="lg:hidden mb-10">
            <h1 className="font-display text-6xl leading-none tracking-wide text-base-content">KOWLOON</h1>
            <div className="w-8 h-0.5 bg-primary mt-3" />
          </div>

          <div className="mb-8">
            <h2 className="font-display text-4xl leading-none tracking-wide text-base-content">
              Reset password
            </h2>
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 mt-2">
              We'll send you a link
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col gap-6">
              <div className="px-4 py-4 border-l-4 border-success bg-success/5">
                <p className="font-ui text-xs uppercase tracking-widest text-success">
                  If that address is registered, a reset link is on its way.
                </p>
              </div>
              <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
                Check your spam folder if it doesn't arrive within a few minutes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/25 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full py-3 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-base-300 flex flex-col gap-3">
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
