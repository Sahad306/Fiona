import React, { useState } from 'react';
import {
  Wallet,
  User,
  Lock,
  Mail,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Database,
  LogIn,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PRESET_PROFILES } from '../data/defaultData';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'presets';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
}) => {
  const {
    currentUser,
    isAuthenticated,
    login,
    register,
    logout,
    activeProfileKey,
    switchProfile,
    isDbConnected,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'presets'>(initialTab);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('Salaried Employee');
  const [currency, setCurrency] = useState('USD');
  const [incomeTarget, setIncomeTarget] = useState('4500');
  const [expenseBudget, setExpenseBudget] = useState('2800');

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      setSuccessMessage('Signed in successfully! Your database records have loaded.');
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setErrorMessage(result.error || 'Invalid email or password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const result = await register(
      {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        currency,
        monthlyIncomeTarget: parseFloat(incomeTarget) || 4000,
        monthlyExpenseBudget: parseFloat(expenseBudget) || 2500,
      },
      false
    );
    setLoading(false);

    if (result.success) {
      setSuccessMessage(`Account registered for ${name.trim()}! Please sign in with your password.`);
      setActiveTab('login');
      setPassword('');
    } else {
      setErrorMessage(result.error || 'Failed to create account.');
    }
  };

  const DEMO_PASSWORD = 'password123'; // demo credential; must match server DEMO_PASSWORD default
  const handleQuickDemoLogin = async (demoEmail: string, presetKey: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    const result = await login(demoEmail, DEMO_PASSWORD);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(`Logged into ${demoEmail} database!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } else {
      // Fallback switch profile locally
      switchProfile(presetKey);
      setSuccessMessage(`Loaded ${presetKey} archetype locally.`);
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  return (
    <div
      id="auth_modal_overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="auth_modal_card"
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto relative"
      >
        {/* Close Button */}
        <button
          id="btn_close_auth_modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-[1px] shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-300">
                FINORA
              </span>
              <span className="text-[9px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Vault OS
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 ml-auto">
                <Database className="w-3 h-3" />
                {isDbConnected ? 'Vault Persistent' : 'Local Storage'}
              </span>
            </div>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight mt-1.5">
            {activeTab === 'login' && 'Sign In to Your Financial Vault'}
            {activeTab === 'register' && 'Create Your FINORA Account'}
            {activeTab === 'presets' && 'Explore Demo Personas & Vaults'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeTab === 'login' && 'Enter your credentials to securely access your cloud-saved financial records.'}
            {activeTab === 'register' && 'Register a new profile to start tracking budgets, incomes, and goals.'}
            {activeTab === 'presets' && 'Instant access to pre-populated financial scenarios with real database records.'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div
            id="auth_error_alert"
            className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            id="auth_success_alert"
            className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            id="tab_login"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            id="tab_register"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register
          </button>
          <button
            id="tab_presets"
            onClick={() => {
              setActiveTab('presets');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Quick Demos
          </button>
        </div>

        {/* TAB 1: Sign In Form */}
        {activeTab === 'login' && (
          <form id="form_login" onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input_login_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah@finora.io"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input_login_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn_submit_login"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to Database
                </>
              )}
            </button>

            {/* Quick Demo Fillers */}
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Or sign in with 1-click verified demo accounts:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('demo@finora.io', 'demo')}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 rounded-lg text-left text-[11px] text-slate-200 flex items-center justify-between cursor-pointer transition-colors col-span-2"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      Demo <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Try It</span>
                    </div>
                    <div className="text-[10px] text-slate-400">demo@finora.io • Sample Ledger</div>
                  </div>
                  <span className="text-emerald-400 font-bold">1-Click Sign In →</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('sarah@finora.io', 'employee')}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white">Sarah Chen</div>
                    <div className="text-[10px] text-slate-400">Salaried ($7,800/mo)</div>
                  </div>
                  <span className="text-emerald-400 font-bold">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('alex@finora.io', 'student')}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white">Alex Turner</div>
                    <div className="text-[10px] text-slate-400">Student ($1,850/mo)</div>
                  </div>
                  <span className="text-emerald-400 font-bold">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('marco@finora.io', 'freelancer')}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white">Marco Silva</div>
                    <div className="text-[10px] text-slate-400">Freelancer ($5,800/mo)</div>
                  </div>
                  <span className="text-emerald-400 font-bold">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('elena@finora.io', 'business')}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white">Elena Rostova</div>
                    <div className="text-[10px] text-slate-400">Business ($18,500/mo)</div>
                  </div>
                  <span className="text-emerald-400 font-bold">→</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Registration Form */}
        {activeTab === 'register' && (
          <form id="form_register" onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input_register_name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input_register_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password (min 6 characters) *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input_register_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Financial Archetype</label>
                <select
                  id="select_register_role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Salaried Employee">Salaried Employee</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="University Student">University Student</option>
                  <option value="Small Business Owner">Small Business Owner</option>
                  <option value="Family Household">Family Household</option>
                  <option value="Individual">Individual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Base Currency</label>
                <select
                  id="select_register_currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Income Target
                </label>
                <input
                  id="input_register_income_target"
                  type="number"
                  step="100"
                  value={incomeTarget}
                  onChange={(e) => setIncomeTarget(e.target.value)}
                  placeholder="4500"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Expense Budget
                </label>
                <input
                  id="input_register_expense_budget"
                  type="number"
                  step="100"
                  value={expenseBudget}
                  onChange={(e) => setExpenseBudget(e.target.value)}
                  placeholder="2800"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="btn_submit_register"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Provisioning Database...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account & Database
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: Quick Demo Personas */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">
              Select an archetype to instantly switch and evaluate FINORA with realistic data:
            </p>
            {Object.entries(PRESET_PROFILES).map(([key, data]) => {
              const isSelected = activeProfileKey === key;
              const p = data.profile;
              return (
                <div
                  key={key}
                  id={`preset_option_${key}`}
                  onClick={() => handleQuickDemoLogin(`${key}@finora.io`, key)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-white'
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {p.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Target: ${p.monthlyIncomeTarget}/mo • Budget: ${p.monthlyExpenseBudget}/mo • {data.transactions.length} Tx
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium">
                      Select →
                    </span>
                  )}
                </div>
              );
            })}

            {isAuthenticated && (
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  Sign Out of Current Account
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
