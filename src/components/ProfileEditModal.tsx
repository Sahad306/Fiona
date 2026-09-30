import React, { useState, useRef } from 'react';
import { X, Lock, Pencil, ShieldCheck, CheckCircle2, User, MapPin, Briefcase, Target, Sparkles, IdCard, Calendar, TrendingUp, CreditCard, Phone, Shield, GraduationCap, KeyRound, Mail, Camera, Loader2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { UserRole } from '../types';

const CURRENCY_OPTIONS: { code: string; symbol: string; label: string }[] = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'BDT', symbol: 'Tk', label: 'BDT (Tk)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'CAD', symbol: '$', label: 'CAD ($)' },
  { code: 'AUD', symbol: '$', label: 'AUD ($)' },
];

const ROLE_OPTIONS: UserRole[] = [
  'University Student',
  'Salaried Employee',
  'Freelancer',
  'Small Business Owner',
  'Family Household',
  'Individual',
];

const RISK_OPTIONS = ['conservative', 'moderate', 'aggressive'] as const;

interface EditForm {
  name: string;
  role: UserRole;
  currency: string;
  monthlyIncomeTarget: number;
  monthlyExpenseBudget: number;
  phone: string;
  location: string;
  occupation: string;
  bio: string;
  financialGoal: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  university?: string;
  program?: string;
  degree?: string;
  year?: string;
  semester?: string;
  studentId?: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'view' | 'password' | 'edit';

const inputCls =
  'w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none placeholder-slate-600';

/* ── dark navy / cyan theme tokens ── */
const cardCls = 'rounded-xl border border-slate-800 bg-[#131c2e]';
const btnPrimary =
  'rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors';
const btnSecondary =
  'rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors border border-slate-700';

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
    <span className="mt-0.5 text-cyan-400 shrink-0">{icon}</span>
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-24 shrink-0 pt-0.5">{label}</span>
    <span className="text-xs text-slate-100 font-medium text-right flex-1 min-w-0 break-words">{value || '—'}</span>
  </div>
);

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { profile, currentUser, verifyPassword, updateAccountProfile, formatCurrency, changePassword, changeEmail } = useFinance();
  const [mode, setMode] = useState<Mode>('view');
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);

  // Security section states
  const [secTab, setSecTab] = useState<'none' | 'password' | 'email'>('none');
  const [secBusy, setSecBusy] = useState(false);
  const [secError, setSecError] = useState('');
  const [secSuccess, setSecSuccess] = useState('');
  const [curPass, setCurPass] = useState('');
  const [nextPass, setNextPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [nextEmail, setNextEmail] = useState('');

  // Avatar upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  if (!isOpen) return null;

  /* Pick an image, downscale to 256px JPEG (fast syncs, tiny storage), persist via server. */
  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    setAvatarBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const size = 256;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d')!;
          const scale = Math.max(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('read')) };
        img.src = url;
      });
      const res = await updateAccountProfile({ avatarUrl: dataUrl });
      if (!res.success) {
        setAvatarError(res.error || 'Failed to update photo.');
      }
    } catch {
      setAvatarError('Could not process that image.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const openPasswordGate = () => {
    setMode('password');
    setPassword('');
    setPwError('');
    setSaveError('');
  };

  const close = () => {
    setMode('view');
    setPassword('');
    setPwError('');
    setSaveError('');
    setForm(null);
    onClose();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPwError('');
    const res = await verifyPassword(password);
    setBusy(false);
    if (!res.success) {
      setPwError(res.error || 'Incorrect password.');
      return;
    }
    setForm({
      name: profile.name,
      role: profile.role,
      currency: profile.currency,
      monthlyIncomeTarget: profile.monthlyIncomeTarget ?? 0,
      monthlyExpenseBudget: profile.monthlyExpenseBudget ?? 0,
      phone: profile.phone || '',
      location: profile.location || '',
      occupation: profile.occupation || '',
      bio: profile.bio || '',
      financialGoal: profile.financialGoal || '',
      riskTolerance: profile.riskTolerance || 'moderate',
      university: profile.university || '',
      program: profile.program || '',
      degree: profile.degree || '',
      year: profile.year || '',
      semester: profile.semester || '',
      studentId: profile.studentId || '',
    });
    setPassword('');
    setMode('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setSaveError('');
    const symbol = CURRENCY_OPTIONS.find((c) => c.code === form.currency)?.symbol || '$';
    const res = await updateAccountProfile({ ...form, currencySymbol: symbol });
    setBusy(false);
    if (!res.success) {
      setSaveError(res.error || 'Failed to save profile.');
      return;
    }
    setForm(null);
    setMode('view');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const openSecTab = (tab: 'none' | 'password' | 'email') => {
    setSecTab(tab);
    setSecError('');
    setSecSuccess('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    setSecSuccess('');
    if (!curPass || !nextPass) {
      setSecError('Please fill in both password fields.');
      return;
    }
    if (nextPass.length < 6) {
      setSecError('New password must be at least 6 characters.');
      return;
    }
    if (nextPass !== confirmPass) {
      setSecError('New passwords do not match.');
      return;
    }
    setSecBusy(true);
    const res = await changePassword(curPass, nextPass);
    setSecBusy(false);
    if (!res.success) {
      setSecError(res.error || 'Failed to change password.');
      return;
    }
    setCurPass('');
    setNextPass('');
    setConfirmPass('');
    setSecSuccess('Password changed. Other sessions were signed out.');
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    setSecSuccess('');
    if (!emailPass || !nextEmail.trim() || !nextEmail.includes('@')) {
      setSecError('Please enter your password and a valid new email.');
      return;
    }
    setSecBusy(true);
    const res = await changeEmail(emailPass, nextEmail.trim());
    setSecBusy(false);
    if (!res.success) {
      setSecError(res.error || 'Failed to change email.');
      return;
    }
    setEmailPass('');
    setNextEmail('');
    setSecSuccess(`Email updated to ${nextEmail.trim()}.`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#0f172a] border border-slate-800 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.08)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 flex items-center justify-center font-black text-[13px] text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.35)]">F</div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Profile Center</h2>
              <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/80 font-semibold">FINORA Account &amp; Security</p>
            </div>
            {mode === 'edit' && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-semibold">
                Editing unlocked
              </span>
            )}
            {mode === 'password' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                <Lock size={10} /> Password required
              </span>
            )}
          </div>
          <button onClick={close} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {saved && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <CheckCircle2 size={14} /> Profile updated successfully.
            </div>
          )}

          {/* ============ VIEW MODE ============ */}
          {mode === 'view' && (
            <>
              {/* mini profile header card */}
              <div className={`relative overflow-hidden ${cardCls} p-4 mb-4`}>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/8 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex items-center gap-4">
                  {/* avatar with cyan glowing ring + photo upload */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 p-[2px] shadow-[0_0_18px_rgba(6,182,212,0.35)]">
                      <div className="w-full h-full bg-[#0f172a] rounded-full flex items-center justify-center overflow-hidden">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-teal-300">
                            {profile.name.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white truncate">{profile.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{profile.email}</p>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                      <span className="w-1 h-1 rounded-full bg-cyan-400" /> {profile.role}
                    </span>

                  </div>
                </div>
              </div>

              {/* info list */}
              <div className={`${cardCls} px-4 py-1 mb-4`}>
                <InfoRow icon={<TrendingUp className="w-3.5 h-3.5" />} label="Income Target" value={formatCurrency(profile.monthlyIncomeTarget ?? 0)} />
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Expense Budget" value={formatCurrency(profile.monthlyExpenseBudget ?? 0)} />
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={profile.phone} />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={profile.location} />
                <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Occupation" value={profile.occupation} />
                <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Risk Tolerance" value={profile.riskTolerance ? profile.riskTolerance.charAt(0).toUpperCase() + profile.riskTolerance.slice(1) : ''} />
                <InfoRow icon={<Target className="w-3.5 h-3.5" />} label="Goal" value={profile.financialGoal} />
                <InfoRow icon={<Sparkles className="w-3.5 h-3.5" />} label="Bio" value={profile.bio} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Member Since" value={profile.joinedDate} />
                <InfoRow icon={<IdCard className="w-3.5 h-3.5" />} label="Account ID" value={<span className="font-mono text-[10px]">{currentUser?.id || profile.id}</span>} />
              </div>

              <button
                onClick={openPasswordGate}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${btnPrimary} text-xs`}
              >
                <Lock size={13} /> Edit Profile (password required)
              </button>

              {/* Security section */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-[#131c2e]/60 p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <KeyRound size={12} className="text-cyan-400" /> Security
                </h3>

                {secSuccess && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold">
                    <CheckCircle2 size={13} /> {secSuccess}
                  </div>
                )}

                {secTab === 'none' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openSecTab('password')}
                      className={`px-3 py-2 ${btnSecondary} text-[11px]`}
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => openSecTab('email')}
                      className={`px-3 py-2 ${btnSecondary} text-[11px]`}
                    >
                      Change Email
                    </button>
                  </div>
                )}

                {secTab === 'password' && (
                  <form onSubmit={handleChangePassword} className="space-y-2.5">
                    <input
                      type="password"
                      value={curPass}
                      onChange={(e) => setCurPass(e.target.value)}
                      placeholder="Current password"
                      className={inputCls}
                    />
                    <input
                      type="password"
                      value={nextPass}
                      onChange={(e) => setNextPass(e.target.value)}
                      placeholder="New password (min 6 characters)"
                      className={inputCls}
                    />
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Confirm new password"
                      className={inputCls}
                    />
                    {secError && <p className="text-[11px] text-red-400 font-semibold">{secError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openSecTab('none')}
                        className={`flex-1 px-3 py-2 ${btnSecondary} text-[11px]`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={secBusy}
                        className={`flex-1 px-3 py-2 ${btnPrimary} text-[11px]`}
                      >
                        {secBusy ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                )}

                {secTab === 'email' && (
                  <form onSubmit={handleChangeEmail} className="space-y-2.5">
                    <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Mail size={11} /> Current: {profile.email}</p>
                    <input
                      type="email"
                      value={nextEmail}
                      onChange={(e) => setNextEmail(e.target.value)}
                      placeholder="New email address"
                      className={inputCls}
                    />
                    <input
                      type="password"
                      value={emailPass}
                      onChange={(e) => setEmailPass(e.target.value)}
                      placeholder="Account password (to confirm)"
                      className={inputCls}
                    />
                    {secError && <p className="text-[11px] text-red-400 font-semibold">{secError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openSecTab('none')}
                        className={`flex-1 px-3 py-2 ${btnSecondary} text-[11px]`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={secBusy}
                        className={`flex-1 px-3 py-2 ${btnPrimary} text-[11px]`}
                      >
                        {secBusy ? 'Updating…' : 'Update Email'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          {/* ============ PASSWORD GATE ============ */}
          {mode === 'password' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <Lock size={16} className="text-amber-400 shrink-0" />
                <p className="text-[11px] text-amber-200">
                  For your security, enter your account password to unlock profile editing.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Password</label>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
              {pwError && <p className="text-[11px] text-red-400 font-semibold">{pwError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className={`flex-1 px-4 py-2.5 ${btnSecondary} text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !password}
                  className={`flex-1 px-4 py-2.5 ${btnPrimary} text-xs`}
                >
                  {busy ? 'Verifying…' : 'Unlock Editing'}
                </button>
              </div>
            </form>
          )}

          {/* ============ EDIT MODE ============ */}
          {mode === 'edit' && form && (
            <form onSubmit={handleSave} className="space-y-3">
              {/* Profile photo — editable ONLY here, behind the password gate */}
              <div className="flex items-center gap-4 pb-1">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 p-[2px] shadow-[0_0_18px_rgba(6,182,212,0.35)]">
                    <div className="w-full h-full bg-[#0f172a] rounded-full flex items-center justify-center overflow-hidden">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-teal-300">
                          {profile.name.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy}
                    title="Change profile photo"
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-cyan-500 hover:bg-cyan-400 rounded-full flex items-center justify-center text-slate-950 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {avatarBusy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Profile Photo</p>
                  <p className="text-[10px] text-slate-400">Circle-cropped automatically, saved to your account.</p>
                  {avatarError && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{avatarError}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                  <select value={form.role} onChange={(e) => set('role', e.target.value as UserRole)} className={inputCls}>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={inputCls}>
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Income Target</label>
                  <input
                    type="number"
                    value={form.monthlyIncomeTarget}
                    onChange={(e) => set('monthlyIncomeTarget', Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Expense Budget</label>
                  <input
                    type="number"
                    value={form.monthlyExpenseBudget}
                    onChange={(e) => set('monthlyExpenseBudget', Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Occupation</label>
                  <input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Risk Tolerance</label>
                  <select
                    value={form.riskTolerance}
                    onChange={(e) => set('riskTolerance', e.target.value as EditForm['riskTolerance'])}
                    className={inputCls}
                  >
                    {RISK_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Financial Goal</label>
                  <input value={form.financialGoal} onChange={(e) => set('financialGoal', e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bio</label>
                  <textarea
                    rows={2}
                    value={form.bio}
                    onChange={(e) => set('bio', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {form.role === 'University Student' && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Academic Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">University</label>
                      <input value={form.university} onChange={(e) => set('university', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Department / Program</label>
                      <input value={form.program} onChange={(e) => set('program', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Degree</label>
                      <input value={form.degree} onChange={(e) => set('degree', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
                      <input value={form.year} onChange={(e) => set('year', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                      <input value={form.semester} onChange={(e) => set('semester', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Student ID</label>
                      <input value={form.studentId} onChange={(e) => set('studentId', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              )}

              {saveError && <p className="text-[11px] text-red-400 font-semibold">{saveError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className={`flex-1 px-4 py-2.5 ${btnSecondary} text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !form.name.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 ${btnPrimary} text-xs`}
                >
                  <Pencil size={12} /> {busy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;
