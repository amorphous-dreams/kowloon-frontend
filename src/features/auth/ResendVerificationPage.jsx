import { useState } from 'react'
import { Link } from 'react-router-dom'

const SERVER = import.meta.env.VITE_SERVER_URL || window.KOWLOON_CONFIG?.apiUrl || window.location.origin

export default function ResendVerificationPage() {
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${SERVER}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
    } catch {
      // Same pattern as forgot-password: always show success to prevent enumeration
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-8">
      <div className="w-full max-w-sm mx-auto">

        <div className="mb-10">
          <h1 className="font-display text-6xl leading-none tracking-wide text-base-content">KOWLOON</h1>
          <div className="w-8 h-0.5 bg-primary mt-3" />
        </div>

        <div className="mb-8">
          <h2 className="font-display text-4xl leading-none tracking-wide text-base-content">
            Resend verification
          </h2>
        </div>

        {submitted ? (
          <div className="flex flex-col gap-4">
            <div className="px-4 py-4 border-l-4 border-success bg-success/5">
              <p className="font-ui text-xs uppercase tracking-widest text-success">
                If that address is registered and unverified, a new link is on its way.
              </p>
            </div>
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
              {loading ? 'Sending…' : 'Resend link'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-base-300">
          <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
            <Link to="/login" className="text-primary hover:opacity-70 transition-opacity">
              Back to sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
