// PasswordInput — input with eye toggle for show/hide.
// Mirrors the underlying <input> API: pass through value, onChange, placeholder,
// required, autoComplete, className, etc. The eye button overlays the right edge.

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PasswordInput({
  className = '',
  ...inputProps
}) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative w-full">
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        // Reserve room on the right for the toggle button so long values
        // don't slide under the eye.
        className={`pr-9 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible
          ? t('auth.hidePassword', { defaultValue: 'Hide password' })
          : t('auth.showPassword', { defaultValue: 'Show password' })
        }
        title={visible
          ? t('auth.hidePassword', { defaultValue: 'Hide password' })
          : t('auth.showPassword', { defaultValue: 'Show password' })
        }
        tabIndex={-1}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-base-content/40 hover:text-base-content transition-colors"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
