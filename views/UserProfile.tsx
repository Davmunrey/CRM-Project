import { useState } from 'react'
import {
  User, Mail, Phone, Briefcase, Shield, Lock, Camera,
  Check, X, Eye, EyeOff,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { ROLE_COLORS } from '../utils/permissions'
import { Avatar } from '../components/ui/Avatar'
import { toast } from '../store/toastStore'
import { useTranslations } from '../i18n'
import { formatDateShort, formatDateTime } from '../utils/formatters'
import { SecurePasswordField } from '../components/auth/SecurePasswordField'
import { formatPasswordStrengthIssues, getPasswordStrengthIssues } from '../lib/securePassword'

export function UserProfile() {
  const t = useTranslations()
  const { currentUser, updateProfile, changePassword } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    jobTitle: currentUser?.jobTitle || '',
    phone: currentUser?.phone || '',
  })

  const [pwForm, setPwForm] = useState({
    current: '',
    newPw: '',
    confirm: '',
  })

  if (!currentUser) return null

  const colors = ROLE_COLORS[currentUser.role]

  const handleSaveProfile = () => {
    updateProfile(form)
    setEditing(false)
    toast.success(t.auth.editProfile)
  }

  const handleChangePassword = async () => {
    const strengthIssues = getPasswordStrengthIssues(pwForm.newPw)
    if (strengthIssues.length > 0) {
      toast.error(
        formatPasswordStrengthIssues(strengthIssues, {
          length: t.errors.passwordWeakLength,
          lower: t.errors.passwordWeakLower,
          upper: t.errors.passwordWeakUpper,
          digit: t.errors.passwordWeakDigit,
          symbol: t.errors.passwordWeakSymbol,
        }),
      )
      return
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error(t.auth.passwordsDoNotMatch)
      return
    }
    const result = await changePassword(currentUser.id, pwForm.current, pwForm.newPw)
    if (result.success) {
      toast.success(t.auth.savePassword)
      setChangingPw(false)
      setPwForm({ current: '', newPw: '', confirm: '' })
    } else {
      toast.error(result.error || t.auth.password)
    }
  }

  const inputBase =
    'crm-themed-input py-2.5 text-sm rounded-xl border'

  return (
    <div className="crm-page space-y-6">
      {/* Profile header */}
      <div className="glass rounded-2xl shadow-float border-fg/10 p-8 text-center">
        <div className="relative inline-block mb-4">
          <Avatar name={currentUser.name} size="xl" />
          <button
            type="button"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center text-fg shadow-lg hover:bg-accent-500 transition-colors"
            aria-label={t.common.edit}
          >
            <Camera size={14} />
          </button>
        </div>
        <h2 className="text-xl font-bold propel-profile-card-title">{currentUser.name}</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentUser.jobTitle}</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {t.team.roleLabels[currentUser.role]}
          </span>
        </div>
      </div>

      {/* Profile info */}
      <div className="glass rounded-2xl border-fg/8 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold propel-profile-card-title">{t.auth.profile}</h3>
          {!editing ? (
            <button
              type="button"
              onClick={() => { setForm({ name: currentUser.name, jobTitle: currentUser.jobTitle, phone: currentUser.phone || '' }); setEditing(true) }}
              className="text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              {t.common.edit}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-fg-subtle hover:text-[var(--text-main)] hover:bg-fg/8 transition-colors" aria-label={t.common.cancel}>
                <X size={14} />
              </button>
              <button type="button" onClick={handleSaveProfile} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-gradient text-xs text-fg font-medium">
                <Check size={12} /> {t.common.save}
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="propel-form-label">{t.common.name}</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 propel-input-icon pointer-events-none" />
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`${inputBase} pl-10 pr-4`}
                  autoComplete="name"
                />
              </div>
            </div>
            <div>
              <label className="propel-form-label">{t.contacts.jobTitle}</label>
              <div className="relative">
                <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 propel-input-icon pointer-events-none" />
                <input
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className={`${inputBase} pl-10 pr-4`}
                  autoComplete="organization-title"
                />
              </div>
            </div>
            <div>
              <label className="propel-form-label">{t.common.phone}</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 propel-input-icon pointer-events-none" />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`${inputBase} pl-10 pr-4`}
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { icon: <User size={14} />, label: t.common.name, value: currentUser.name },
              { icon: <Mail size={14} />, label: t.auth.email, value: currentUser.email },
              { icon: <Briefcase size={14} />, label: t.contacts.jobTitle, value: currentUser.jobTitle || '-' },
              { icon: <Phone size={14} />, label: t.common.phone, value: currentUser.phone || '-' },
              { icon: <Shield size={14} />, label: t.team.role, value: t.team.roleLabels[currentUser.role] },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="propel-input-icon shrink-0">{icon}</span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider propel-form-label !mb-0">{label}</p>
                  <p className="text-sm propel-profile-value">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="glass rounded-2xl border-fg/8 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold propel-profile-card-title flex items-center gap-2">
            <Lock size={14} className="propel-input-icon" />
            {t.auth.password}
          </h3>
          {!changingPw && (
            <button
              type="button"
              onClick={() => setChangingPw(true)}
              className="text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              {t.auth.savePassword}
            </button>
          )}
        </div>

        {changingPw ? (
          <div className="space-y-3">
            <div>
              <label className="propel-form-label">{t.auth.currentPassword}</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                  className={`${inputBase} px-4 pr-10`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 propel-input-icon hover:opacity-80"
                  aria-label={showCurrentPw ? t.common.close : t.common.view}
                >
                  {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <SecurePasswordField
              label={t.auth.newPassword}
              value={pwForm.newPw}
              onChange={(newPw) => setPwForm((f) => ({ ...f, newPw }))}
              onGeneratedPassword={(p) => setPwForm((f) => ({ ...f, newPw: p, confirm: p }))}
              placeholder={t.auth.password}
              autoComplete="new-password"
            />
            <SecurePasswordField
              label={t.auth.confirmPassword}
              value={pwForm.confirm}
              onChange={(confirm) => setPwForm((f) => ({ ...f, confirm }))}
              showGenerator={false}
              showPolicyHint={false}
              showRequirementChecklist={false}
              placeholder={t.auth.confirmPassword}
              autoComplete="new-password"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setChangingPw(false); setPwForm({ current: '', newPw: '', confirm: '' }) }}
                className="px-4 py-2 rounded-xl text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {t.common.cancel}
              </button>
              <button type="button" onClick={handleChangePassword} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-fg text-sm font-semibold">
                <Check size={14} /> {t.common.save}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.auth.editProfile}</p>
        )}
      </div>

      {/* Session info */}
      <div className="glass rounded-xl border-fg/8 p-4">
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{t.auth.login}: {currentUser.lastLoginAt ? formatDateTime(currentUser.lastLoginAt) : t.common.notAvailable}</span>
          <span>{t.common.createdAt}: {formatDateShort(currentUser.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
