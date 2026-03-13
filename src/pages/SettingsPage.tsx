import { useEffect, useState } from 'react'
import PasswordField from '../components/PasswordField'
import { apiBasePrefix } from '../config'
import type { AuthUser, ProfileSettingsUser } from '../types'

function SettingsPage({
  currentUser,
  onProfileUpdated,
}: {
  currentUser: AuthUser
  onProfileUpdated: (user: AuthUser) => void
}) {
  const [profile, setProfile] = useState<ProfileSettingsUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    first_name: currentUser.first_name,
    last_name: currentUser.last_name,
    email: currentUser.email,
    phone: currentUser.phone ?? '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const loadProfile = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePrefix}/api/auth/profile`)
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? 'Failed to load profile.')
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { user: ProfileSettingsUser }
      setProfile(payload.user)
      setForm((prev) => ({
        ...prev,
        first_name: payload.user.first_name,
        last_name: payload.user.last_name,
        email: payload.user.email,
        phone: payload.user.phone ?? '',
      }))
    } catch {
      setError('Unable to connect to profile endpoint.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile().catch(() => setLoading(false))
  }, [])

  const submitProfile = async () => {
    setError('')
    setSuccess('')

    if (form.new_password !== form.confirm_password) {
      setError('New password and confirmation do not match.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${apiBasePrefix}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      })

      const payload = (await response.json()) as { error?: string; user?: ProfileSettingsUser; message?: string }
      if (!response.ok || !payload.user) {
        setError(payload.error ?? 'Failed to update profile.')
        setSaving(false)
        return
      }

      setProfile(payload.user)
      setForm((prev) => ({
        ...prev,
        first_name: payload.user?.first_name ?? prev.first_name,
        last_name: payload.user?.last_name ?? prev.last_name,
        email: payload.user?.email ?? prev.email,
        phone: payload.user?.phone ?? '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      }))
      onProfileUpdated({
        id: payload.user.id,
        first_name: payload.user.first_name,
        last_name: payload.user.last_name,
        email: payload.user.email,
        role: payload.user.role,
        employee_no: payload.user.employee_no,
        phone: payload.user.phone,
        status: payload.user.status,
        created_at: payload.user.created_at,
        updated_at: payload.user.updated_at,
      })
      setSuccess(payload.message ?? 'Profile updated successfully.')
    } catch {
      setError('Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-4 md:p-5">
        <p className="text-xs uppercase tracking-wide text-teal-700">Account Settings</p>
        <h2 className="text-xl font-semibold text-slate-900">Profile and sign-in settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Update your basic account details. Role and employee number remain admin-managed.
        </p>
      </article>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <article className="rounded-2xl border border-teal-100 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Account Summary</h3>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading profile...</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {profile?.first_name} {profile?.last_name}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                <p className="mt-1 font-semibold text-slate-900">{profile?.role ?? currentUser.role}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Employee No</p>
                <p className="mt-1 font-semibold text-slate-900">{profile?.employee_no ?? 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 font-semibold text-slate-900">{profile?.status ?? 'active'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
                <p className="mt-1 font-semibold text-slate-900">{profile?.created_at ?? 'n/a'}</p>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-teal-100 bg-white p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-900">Edit Profile</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              First Name
              <input
                className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                value={form.first_name}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Last Name
              <input
                className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                value={form.last_name}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Email
              <input
                className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                value={form.email}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Phone
              <input
                className="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                value={form.phone}
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">Change Password</h4>
            <p className="mt-1 text-xs text-slate-500">
              Leave these blank if you only want to update your profile details.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Current Password
                <PasswordField
                  inputClassName="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  onChange={(event) => setForm((prev) => ({ ...prev, current_password: event.target.value }))}
                  value={form.current_password}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                New Password
                <PasswordField
                  inputClassName="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  onChange={(event) => setForm((prev) => ({ ...prev, new_password: event.target.value }))}
                  value={form.new_password}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Confirm Password
                <PasswordField
                  inputClassName="rounded-xl border border-teal-200 px-3 py-2.5 text-sm outline-none ring-teal-400 focus:ring"
                  onChange={(event) => setForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                  value={form.confirm_password}
                />
              </label>
            </div>
          </div>

          <div className="mt-5">
            <button
              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving || loading}
              onClick={() => submitProfile().catch(() => setError('Failed to update profile.'))}
              type="button"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </article>
      </div>
    </div>
  )
}

export default SettingsPage
