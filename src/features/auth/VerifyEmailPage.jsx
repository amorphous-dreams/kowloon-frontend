import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const SERVER = import.meta.env.VITE_SERVER_URL || window.KOWLOON_CONFIG?.apiUrl || window.location.origin

export default function VerifyEmailPage() {
  const [params]  = useSearchParams()
  const token     = params.get('token') ?? ''
  const navigate  = useNavigate()

  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token found in this link.')
      return
    }

    let cancelled = false

    fetch(`${SERVER}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return
        const data = await res.json()
        if (!res.ok) {
          setStatus('error')
          setErrorMsg(data.error || 'Verification failed. The link may have expired.')
          return
        }
        setStatus('success')
        setTimeout(() => {
          if (!cancelled) navigate('/login?verified=success', { replace: true })
        }, 2000)
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg('Could not reach the server. Please try again.')
        }
      })

    return () => { cancelled = true }
  }, [token, navigate])

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-8">
      <div className="w-full max-w-sm mx-auto">

        <div className="mb-10">
          <h1 className="font-display text-6xl leading-none tracking-wide text-base-content">KOWLOON</h1>
          <div className="w-8 h-0.5 bg-primary mt-3" />
        </div>

        {status === 'verifying' && (
          <div className="flex flex-col gap-4">
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/50 animate-pulse">
              Verifying your email address…
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col gap-4">
            <div className="px-4 py-4 border-l-4 border-success bg-success/5">
              <p className="font-ui text-xs uppercase tracking-widest text-success">
                Email verified. Taking you home…
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-6">
            <div className="px-4 py-4 border-l-4 border-error bg-error/5">
              <p className="font-ui text-xs uppercase tracking-widest text-error">
                {errorMsg}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
                <Link to="/login" className="text-primary hover:opacity-70 transition-opacity">
                  Back to sign in
                </Link>
              </p>
              <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
                Need a new link?{' '}
                <Link to="/resend-verification" className="text-primary hover:opacity-70 transition-opacity">
                  Resend verification email
                </Link>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
