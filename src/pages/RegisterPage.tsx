import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PasswordField from '../components/PasswordField'
import { apiBasePrefix } from '../config'
import brandLogo from '../assets/brand-logo-ui.png'

function RegisterPage() {
  const [form, setForm] = useState({
    employee_no: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const payload = (await response.json()) as { error?: string; message?: string }
      if (!response.ok) {
        setError(payload.error ?? 'Failed to submit registration.')
        return
      }

      setMessage(payload.message ?? 'Registration submitted.')
      setForm({
        employee_no: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
      })
    } catch {
      setError('Unable to connect to registration endpoint.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.2),_transparent_28%),linear-gradient(135deg,_#effcf7_0%,_#dcf1f8_48%,_#ecf2ff_100%)]">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),_transparent_60%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-3 py-3 md:px-4 md:py-4">
        <div className="grid w-full gap-4 lg:h-[calc(100vh-2rem)] lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-[28px] border border-emerald-200/80 bg-white/78 p-5 shadow-[0_24px_80px_rgba(4,35,50,0.14)] backdrop-blur md:p-7 lg:flex lg:h-full lg:flex-col lg:justify-between lg:p-8">
            <div>
              <div className="inline-flex rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                MRH Registration
              </div>
              <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
                Request access to the vehicle management and reservation system.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Submit all required details below. Your account will stay pending until an admin reviews and approves it.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-5 rounded-[28px] border border-white/80 bg-white/72 p-4 shadow-[0_18px_50px_rgba(15,118,110,0.10)]">
              <img alt="Margosatubig Regional Hospital logo" className="h-20 w-20 rounded-2xl object-cover" src={brandLogo} />
              <div className="text-sm leading-6 text-slate-700">
                New accounts are created as requester accounts and require admin approval before sign-in is enabled.
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,_rgba(3,23,39,0.96),_rgba(8,47,73,0.96))] p-5 text-white shadow-[0_28px_90px_rgba(2,6,23,0.34)] md:p-7 lg:flex lg:h-full lg:flex-col lg:justify-center lg:p-8">
            <h2 className="text-2xl font-semibold text-white md:text-3xl">Create an account</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">All fields are required.</p>

            <form className="mt-6 grid grid-cols-1 gap-4" onSubmit={handleSubmit}>
              <input className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40" onChange={(event) => setForm((prev) => ({ ...prev, employee_no: event.target.value }))} placeholder="Employee number" required value={form.employee_no} />
              <input className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40" onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))} placeholder="First name" required value={form.first_name} />
              <input className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40" onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))} placeholder="Last name" required value={form.last_name} />
              <input className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40" onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email address" required type="email" value={form.email} />
              <input className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40" onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone number" required value={form.phone} />
              <PasswordField inputClassName="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40" minLength={8} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Password (min 8 chars)" required value={form.password} />
              <PasswordField inputClassName="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:border-cyan-300 focus:ring-cyan-400/40" minLength={8} onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))} placeholder="Confirm password" required value={form.password_confirmation} />

              {error ? <p className="rounded-2xl border border-red-400/40 bg-red-500/12 px-4 py-3 text-sm font-medium text-red-100">{error}</p> : null}
              {message ? <p className="rounded-2xl border border-emerald-400/40 bg-emerald-500/12 px-4 py-3 text-sm font-medium text-emerald-100">{message}</p> : null}

              <button className="w-full rounded-2xl bg-[linear-gradient(135deg,_#0ea5a6,_#2563eb)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70" disabled={submitting} type="submit">
                {submitting ? 'Submitting...' : 'Submit registration'}
              </button>
            </form>

            <div className="mt-6 text-sm text-slate-300">
              Already registered?{' '}
              <Link className="font-semibold text-cyan-200 transition hover:text-cyan-100" to="/login">
                Return to sign in
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
