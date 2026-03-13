import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName: string
}

function PasswordField({ inputClassName, id, ...props }: PasswordFieldProps) {
  const generatedId = useId()
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id ?? generatedId

  return (
    <div className="relative">
      <input
        {...props}
        className={`${inputClassName} pr-20`}
        id={inputId}
        type={showPassword ? 'text' : 'password'}
      />
      <button
        aria-controls={inputId}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-200 transition hover:text-white"
        onClick={() => setShowPassword((prev) => !prev)}
        type="button"
      >
        {showPassword ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export default PasswordField
