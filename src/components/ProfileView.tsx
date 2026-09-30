import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Target,
  Shield,
  Bell,
  DollarSign,
  CreditCard,
  TrendingUp,
  Calendar,
  Edit3,
  Check,
  X,
  Trash2,
  Download,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  Camera,
  PiggyBank,
  GraduationCap,
  BookOpen,
  Hash,
  Award,
  IdCard,
  Layers,
  Flag,
  Building,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { UserProfile, UserRole, ExpenseCategory } from '../types';
import { DEFAULT_EXPENSE_CATEGORIES } from '../data/defaultData';

interface ProfileViewProps {
  onBackToDashboard?: () => void;
}

const ROLE_OPTIONS: UserRole[] = [
  'University Student',
  'Salaried Employee',
  'Freelancer',
  'Small Business Owner',
  'Family Household',
  'Individual',
];

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative', desc: 'Prioritize safety, minimal risk', color: 'text-sky-400' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced growth with some risk', color: 'text-emerald-400' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Maximum growth, higher risk', color: 'text-amber-400' },
] as const;

const CURRENCIES = [
  { code: 'BDT', symbol: 'Tk', label: 'BDT (Tk Taka)' },
  { code: 'USD', symbol: '$', label: 'USD ($ Dollar)' },
  { code: 'EUR', symbol: '\u20ac', label: 'EUR (\u20ac Euro)' },
  { code: 'GBP', symbol: '\u00a3', label: 'GBP (\u00a3 Pound)' },
  { code: 'INR', symbol: '\u20b9', label: 'INR (\u20b9 Rupee)' },
  { code: 'JPY', symbol: '\u00a5', label: 'JPY (\u00a5 Yen)' },
];

/* ── tiny reusable row for the flat info-list style ── */
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  editContent?: React.ReactNode;
}> = ({ icon, label, value, editing, editContent }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/60 last:border-b-0">
    <span className="mt-0.5 text-cyan-400 shrink-0">{icon}</span>
    <span className="text-xs text-slate-400 w-28 shrink-0 pt-0.5">{label}</span>
    {editing && editContent ? (
      <div className="flex-1 min-w-0">{editContent}</div>
    ) : (
      <span className="text-sm text-white font-medium flex-1 min-w-0 break-words">{value}</span>
    )}
  </div>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ onBackToDashboard }) => {
  const {
    profile,
    updateProfile,
    transactions,
    budgets,
    savingsGoals,
    isAuthenticated,
    currentUser,
    formatCurrency,
    exportJSON,
    resetCurrentProfile,
    deleteAccount,
    summary,
  } = useFinance();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const memberSinceISO = profile.joinedDate; // YYYY-MM-DD
  const isStudent = profile.role === 'University Student';

  const handleStartEdit = (section: string) => {
    setEditingSection(section);
    setEditForm({ ...profile });
    setSaved(false);
  };

  const handleSave = () => {
    updateProfile(editForm);
    setEditingSection(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditForm({});
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    setShowDeleteConfirm(false);
  };

  const toggleCategory = (cat: ExpenseCategory) => {
    const current = editForm.preferredCategories || profile.preferredCategories || [];
    const updated = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    setEditForm({ ...editForm, preferredCategories: updated });
  };

  /* derive display strings */
  const roleDisplay = isStudent
    ? `${profile.program || ''} Student`
    : profile.role;

  const yearSemesterPill = [profile.year, profile.semester].filter(Boolean).join(' \u2022 ');

  const inputCls =
    'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none';
  const selectCls = inputCls + ' cursor-pointer';

  const cardCls = 'bg-[#131c2e] border border-slate-800 rounded-2xl p-6';

  const EditButtons: React.FC<{ section: string }> = ({ section }) =>
    editingSection === section ? (
      <div className="flex items-center gap-2">
        <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 text-slate-950 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-cyan-400 transition-colors"><Check className="w-3 h-3" /> Save</button>
        <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"><X className="w-3 h-3" /> Cancel</button>
      </div>
    ) : (
      <button onClick={() => handleStartEdit(section)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 text-slate-300 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"><Edit3 className="w-3 h-3" /> Edit</button>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button onClick={onBackToDashboard} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" /> My Profile
          </h1>
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-semibold animate-in fade-in">
            <Check className="w-3.5 h-3.5" /> Saved!
          </span>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          PROFILE HEADER CARD (full width)
         ══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a111e] via-[#0f172a] to-[#0a111e] border border-slate-800 shadow-2xl">
        {/* subtle glow blobs */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 w-40 h-40 bg-teal-500/6 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* ── left: avatar ── */}
            <div className="relative group shrink-0">
              {/* cyan glowing ring */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 p-[3px] shadow-[0_0_24px_rgba(6,182,212,0.35)]">
                <div className="w-full h-full bg-[#0f172a] rounded-full flex items-center justify-center overflow-hidden">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-teal-300">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                </div>
              </div>
              <button className="absolute bottom-1 right-1 w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center text-slate-950 shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ── center: identity block ── */}
            <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{profile.name || 'User'}</h2>

              {/* role subheader */}
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-semibold">{roleDisplay || profile.role}</span>
              </div>

              {/* university line */}
              {isStudent && profile.university && (
                <div className="flex items-start gap-2 mt-1.5 text-sm text-slate-400">
                  <Building className="w-4 h-4 text-cyan-400/70 shrink-0 mt-0.5" />
                  <span>{profile.university}</span>
                </div>
              )}

              {/* year / semester pill badge */}
              {yearSemesterPill && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {yearSemesterPill}
                  </span>
                </div>
              )}

              {/* bio tagline */}
              {profile.bio && (
                <p className="text-sm text-slate-400 mt-3 italic">&ldquo;{profile.bio}&rdquo;</p>
              )}
            </div>

            {/* ── right: quick stats column ── */}
            <div className="lg:w-60 w-full space-y-4 shrink-0 lg:border-l lg:border-slate-800 lg:pl-6">
              {isStudent && profile.program && (
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Program</p>
                    <p className="text-sm text-white font-medium">{profile.degree ? `${profile.degree} in ${profile.program}` : profile.program}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Member Since</p>
                  <p className="text-sm text-white font-medium">{memberSinceISO}</p>
                </div>
              </div>

              {isStudent && (
                <div className="flex items-start gap-3">
                  <IdCard className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Student ID</p>
                    <p className="text-sm text-white font-medium">{profile.studentId || '(Not provided)'}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Location</p>
                  <p className="text-sm text-white font-medium">{profile.location || '(Not provided)'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TWO-COLUMN GRID
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Personal Information ── */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" /> Personal Information
            </h3>
            <EditButtons section="personal" />
          </div>

          <InfoRow
            icon={<Phone className="w-4 h-4" />}
            label="Phone"
            value={profile.phone || '\u2014'}
            editing={editingSection === 'personal'}
            editContent={<input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+880 1XXX-XXXXXX" className={inputCls} />}
          />
          <InfoRow
            icon={<MapPin className="w-4 h-4" />}
            label="Location"
            value={profile.location || '\u2014'}
            editing={editingSection === 'personal'}
            editContent={<input value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="City, Country" className={inputCls} />}
          />
          <InfoRow
            icon={<Briefcase className="w-4 h-4" />}
            label="Occupation"
            value={profile.occupation || (isStudent ? 'Student' : '\u2014')}
            editing={editingSection === 'personal'}
            editContent={<input value={editForm.occupation || ''} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} placeholder="Software Engineer, Student..." className={inputCls} />}
          />
          <InfoRow
            icon={<Shield className="w-4 h-4" />}
            label="Risk Tolerance"
            value={profile.riskTolerance ? profile.riskTolerance.charAt(0).toUpperCase() + profile.riskTolerance.slice(1) : '\u2014'}
            editing={editingSection === 'personal'}
            editContent={
              <select value={editForm.riskTolerance || ''} onChange={(e) => setEditForm({ ...editForm, riskTolerance: e.target.value as any })} className={selectCls}>
                <option value="">Select</option>
                {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            }
          />
          <InfoRow
            icon={<Target className="w-4 h-4" />}
            label="Financial Goal"
            value={profile.financialGoal || '\u2014'}
            editing={editingSection === 'personal'}
            editContent={<input value={editForm.financialGoal || ''} onChange={(e) => setEditForm({ ...editForm, financialGoal: e.target.value })} placeholder="e.g. Save for masters" className={inputCls} />}
          />
          <InfoRow
            icon={<Sparkles className="w-4 h-4" />}
            label="Bio"
            value={profile.bio || '\u2014'}
            editing={editingSection === 'personal'}
            editContent={<textarea value={editForm.bio || ''} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} placeholder="Tell us about yourself..." className={inputCls + ' resize-none'} />}
          />
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label="Member Since"
            value={memberSinceISO}
          />
          <InfoRow
            icon={<IdCard className="w-4 h-4" />}
            label="Account ID"
            value={<span className="font-mono text-xs text-slate-300">{profile.id}</span>}
          />
        </div>

        {/* ── RIGHT COLUMN (stacked) ── */}
        <div className="space-y-6">

          {/* Academic Details (students only) */}
          {isStudent && (
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" /> Academic Details
                </h3>
                <EditButtons section="academic" />
              </div>

              <InfoRow
                icon={<Building className="w-4 h-4" />}
                label="University"
                value={profile.university || '\u2014'}
                editing={editingSection === 'academic'}
                editContent={<input value={editForm.university || ''} onChange={(e) => setEditForm({ ...editForm, university: e.target.value })} placeholder="e.g. MIT, BUET" className={inputCls} />}
              />
              <InfoRow
                icon={<BookOpen className="w-4 h-4" />}
                label="Department"
                value={profile.program || '\u2014'}
                editing={editingSection === 'academic'}
                editContent={<input value={editForm.program || ''} onChange={(e) => setEditForm({ ...editForm, program: e.target.value })} placeholder="e.g. Computer Science & Engineering" className={inputCls} />}
              />
              <InfoRow
                icon={<Layers className="w-4 h-4" />}
                label="Degree"
                value={profile.degree || '\u2014'}
                editing={editingSection === 'academic'}
                editContent={
                  <select value={editForm.degree || ''} onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })} className={selectCls}>
                    <option value="">Select</option>
                    <option value="B.Sc.">B.Sc.</option><option value="B.A.">B.A.</option><option value="BBA">BBA</option>
                    <option value="B.Eng.">B.Eng.</option><option value="M.Sc.">M.Sc.</option><option value="M.A.">M.A.</option>
                    <option value="MBA">MBA</option><option value="PhD">PhD</option><option value="Diploma">Diploma</option>
                  </select>
                }
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Year"
                value={profile.year || '\u2014'}
                editing={editingSection === 'academic'}
                editContent={
                  <select value={editForm.year || ''} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className={selectCls}>
                    <option value="">Year</option>
                    <option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option><option value="4th Year">4th Year</option>
                    <option value="5th Year+">5th Year+</option><option value="Graduate">Graduate</option>
                  </select>
                }
              />
              <InfoRow
                icon={<Layers className="w-4 h-4" />}
                label="Semester"
                value={profile.semester || '\u2014'}
                editing={editingSection === 'academic'}
                editContent={
                  <select value={editForm.semester || ''} onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })} className={selectCls}>
                    <option value="">Semester</option>
                    <option value="1st Semester">1st Semester</option><option value="2nd Semester">2nd Semester</option>
                    <option value="Spring">Spring</option><option value="Summer">Summer</option>
                    <option value="Fall">Fall</option><option value="Winter">Winter</option>
                  </select>
                }
              />
              <InfoRow
                icon={<Hash className="w-4 h-4" />}
                label="Student ID"
                value={<span className="font-mono">{profile.studentId || '(Not provided)'}</span>}
                editing={editingSection === 'academic'}
                editContent={<input value={editForm.studentId || ''} onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })} placeholder="University ID number" className={inputCls} />}
              />
            </div>
          )}

          {/* Goal Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c2a2a] via-[#131c2e] to-[#0a111e] border border-cyan-500/20 p-6">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Goal</h3>
                </div>
                <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300 break-words">
                  {profile.financialGoal || (isStudent ? 'Graduate debt-free & build wealth' : 'Financial freedom')}
                </p>
              </div>
              {/* stylized cyan line-art mountain + flag */}
              <svg className="w-28 h-24 shrink-0 text-cyan-400/50 pointer-events-none" viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
                <path d="M8 92 L46 30 L62 55 L82 22 L114 92 Z" />
                <path d="M46 30 L54 42 L62 55" opacity="0.5" />
                <path d="M82 22 L90 34 L82 22" opacity="0.5" />
                {/* flag on the tallest peak */}
                <line x1="82" y1="22" x2="82" y2="6" />
                <path d="M82 6 L96 10 L82 15 Z" fill="rgba(34,211,238,0.35)" stroke="none" />
              </svg>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SETTINGS & DATA (second grid)
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Financial Settings */}
        <div className={cardCls + ' space-y-1'}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" /> Financial Settings
            </h3>
            <EditButtons section="financial" />
          </div>

          <InfoRow
            icon={<User className="w-4 h-4" />}
            label="Role"
            value={profile.role}
            editing={editingSection === 'financial'}
            editContent={
              <select value={editForm.role || profile.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })} className={selectCls}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            }
          />
          <InfoRow
            icon={<DollarSign className="w-4 h-4" />}
            label="Currency"
            value={`${profile.currency} (${profile.currencySymbol})`}
            editing={editingSection === 'financial'}
            editContent={
              <select value={editForm.currency || profile.currency} onChange={(e) => {
                const curr = CURRENCIES.find((c) => c.code === e.target.value);
                setEditForm({ ...editForm, currency: e.target.value, currencySymbol: curr?.symbol || '$' });
              }} className={selectCls}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            }
          />
          <InfoRow
            icon={<TrendingUp className="w-4 h-4" />}
            label="Income Target"
            value={profile.monthlyIncomeTarget ? formatCurrency(profile.monthlyIncomeTarget) : 'Not set'}
            editing={editingSection === 'financial'}
            editContent={<input type="number" value={editForm.monthlyIncomeTarget || ''} onChange={(e) => setEditForm({ ...editForm, monthlyIncomeTarget: parseFloat(e.target.value) || 0 })} className={inputCls} />}
          />
          <InfoRow
            icon={<CreditCard className="w-4 h-4" />}
            label="Expense Budget"
            value={profile.monthlyExpenseBudget ? formatCurrency(profile.monthlyExpenseBudget) : 'Not set'}
            editing={editingSection === 'financial'}
            editContent={<input type="number" value={editForm.monthlyExpenseBudget || ''} onChange={(e) => setEditForm({ ...editForm, monthlyExpenseBudget: parseFloat(e.target.value) || 0 })} className={inputCls} />}
          />
          <InfoRow
            icon={<PiggyBank className="w-4 h-4" />}
            label="Savings Target"
            value={`${profile.savingsTargetPercent || 20}% of income`}
            editing={editingSection === 'financial'}
            editContent={
              <div className="flex items-center gap-3">
                <input type="range" min={5} max={80} step={5} value={editForm.savingsTargetPercent || profile.savingsTargetPercent || 20} onChange={(e) => setEditForm({ ...editForm, savingsTargetPercent: parseInt(e.target.value) })} className="flex-1 accent-cyan-500 cursor-pointer" />
                <span className="text-sm font-bold text-cyan-400 w-10 text-right">{editForm.savingsTargetPercent || profile.savingsTargetPercent || 20}%</span>
              </div>
            }
          />
        </div>

        {/* Notifications & Data */}
        <div className={cardCls + ' space-y-3'}>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" /> Notifications & Data
          </h3>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs font-semibold text-white">Push Notifications</p>
                <p className="text-[10px] text-slate-400">Budget alerts, savings milestones</p>
              </div>
            </div>
            <button onClick={() => updateProfile({ notificationsEnabled: !profile.notificationsEnabled })} className={`w-10 h-5.5 rounded-full transition-all cursor-pointer ${profile.notificationsEnabled !== false ? 'bg-cyan-500' : 'bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${profile.notificationsEnabled !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-xs font-semibold text-white">Weekly Report Email</p>
                <p className="text-[10px] text-slate-400">Summary every week</p>
              </div>
            </div>
            <button onClick={() => updateProfile({ weeklyReportEmail: !profile.weeklyReportEmail })} className={`w-10 h-5.5 rounded-full transition-all cursor-pointer ${profile.weeklyReportEmail ? 'bg-cyan-500' : 'bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${profile.weeklyReportEmail ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-semibold text-white">Budget Alert Threshold</p>
              </div>
              <span className="text-xs font-bold text-amber-400">{profile.budgetAlertThreshold || 80}%</span>
            </div>
            <input type="range" min={50} max={100} step={5} value={profile.budgetAlertThreshold || 80} onChange={(e) => updateProfile({ budgetAlertThreshold: parseInt(e.target.value) })} className="w-full accent-amber-500 cursor-pointer" />
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Management</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={exportJSON} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer border border-slate-700">
                <Download className="w-3.5 h-3.5" /> Export Backup
              </button>
              <button onClick={resetCurrentProfile} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold rounded-xl transition-colors cursor-pointer border border-slate-700 hover:border-amber-500/40">
                <AlertTriangle className="w-3.5 h-3.5" /> Reset Data
              </button>
            </div>
          </div>

          {isAuthenticated && (
            <div className="pt-3 border-t border-rose-500/20">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2">Danger Zone</p>
              {showDeleteConfirm ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-rose-300">Permanently delete your account and all data?</p>
                  <div className="flex gap-2">
                    <button onClick={handleDeleteAccount} className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors">Yes, Delete</button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold rounded-xl transition-colors cursor-pointer border border-rose-500/30">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Account
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
