import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Database,
  LogIn,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Target,
  Briefcase,
  GraduationCap,
  Phone,
  MapPin,
  Calendar,
  Camera,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { UserRole } from '../types';

interface AuthGatewayProps {
  onEnterGuest?: () => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onEnterGuest }) => {
  const { login, register, isDbConnected } = useFinance();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form input states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regRole, setRegRole] = useState<UserRole>('University Student');
  const [regCurrency, setRegCurrency] = useState('USD');
  const [regIncomeTarget, setRegIncomeTarget] = useState('1800');
  const [regExpenseBudget, setRegExpenseBudget] = useState('1200');
  const [regProfession, setRegProfession] = useState('');
  const [regUniversity, setRegUniversity] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regAvatar, setRegAvatar] = useState('');

  // Auto-crop the picked image to a 256px circle preview for registration.
  const handleRegAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(size / img.width, size / img.height);
      ctx.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2, img.width * scale, img.height * scale);
      URL.revokeObjectURL(url);
      setRegAvatar(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  };

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot-password flow states
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  // Handle User Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please provide both your Login Email/ID and Password.');
      return;
    }

    setLoading(true);
    const result = await login(loginEmail.trim(), loginPassword);
    setLoading(false);

    if (result.success) {
      setSuccessMessage('Authentication successful! Loading your financial vault...');
    } else {
      setErrorMessage(result.error || 'Invalid credentials. Please verify your email/ID and password.');
    }
  };

  const exitForgotMode = () => {
    setForgotMode(false);
    setForgotStep('email');
    setForgotEmail('');
    setResetCode('');
    setNewPassword('');
    setDevCode(null);
    setErrorMessage(null);
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong.');
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      setForgotStep('reset');
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Network error.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!resetCode.trim() || !newPassword) {
      setErrorMessage('Please enter the reset code and a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), code: resetCode.trim(), password: newPassword }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setErrorMessage(data.error || 'Reset failed.');
        return;
      }
      setLoginEmail(forgotEmail.trim());
      exitForgotMode();
      setSuccessMessage('Password updated! Sign in with your new password.');
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Network error.');
    }
  };

  // Handle User Registration and Redirect to Login Page
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (regName.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters long.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@') || !regEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(regPassword)) {
      setErrorMessage('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(regPassword)) {
      setErrorMessage('Password must contain at least one number.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please confirm your password.');
      return;
    }
    if (regRole === 'University Student' && !regUniversity.trim()) {
      setErrorMessage('Please enter your University / College name.');
      return;
    }

    setLoading(true);
    // register with autoLogin = false so user comes back to log in with ID and password as requested
    const result = await register(
      {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        currency: regCurrency,
        monthlyIncomeTarget: parseFloat(regIncomeTarget) || 1800,
        monthlyExpenseBudget: parseFloat(regExpenseBudget) || 1200,
        university: regUniversity.trim() || undefined,
        location: regCity.trim() || undefined,
        phone: regPhone.trim() || undefined,
        occupation: regProfession.trim() || undefined,
        avatarUrl: regAvatar || undefined,
      },
      true // auto-login — registration goes straight into the profile/dashboard
    );
    setLoading(false);

    if (result.success) {
      // Auto-logged in: AuthGateway unmounts and FINORA renders the dashboard directly.
      return;
    } else {
      setErrorMessage(result.error || 'Failed to create account. Please try again.');
    }
  };

  return (
    <div
      id="finora_auth_gateway"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950"
    >
      {/* Top Brand Bar */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3.5 group cursor-pointer">
            {/* Precision Designed Emblem Logo */}
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/35 transition-all">
                <div className="w-full h-full bg-slate-950/95 rounded-[11px] flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 via-transparent to-cyan-500/15" />
                  <Wallet className="w-5 h-5 text-emerald-400 stroke-[2.2] relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full blur-[2px] opacity-70" />
                </div>
              </div>
            </div>

            {/* Polished Design Name & Brand Hierarchy */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-300">
                  FINORA
                </span>
                <span className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                  Vault OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Intelligent Financial Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-3.5 h-3.5" />
              {isDbConnected ? 'Encrypted Vault Active' : 'Local Sandbox Mode'}
            </span>
            {onEnterGuest && (
              <button
                id="btn_guest_bypass"
                onClick={onEnterGuest}
                className="text-xs text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/30 font-semibold"
              >
                Explore Preview →
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-auto">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Value Proposition & Inspiring Visual Callout */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Wealth Management System</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.15]">
                Master Your Capital. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  Command Your Future.
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed font-normal">
                An institutional-grade personal financial operating system with real-time transaction tracking, predictive budget guardrails, and AI wealth intelligence.
              </p>
            </div>

            {/* Inspiring Statement Card (Replaced Welcome Banner) */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-emerald-950/40 border border-emerald-500/25 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center space-x-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                    Architect Your Financial Independence
                  </h3>
                  <div className="text-[10px] text-emerald-400/90 font-semibold">
                    Autonomous Intelligence • Complete Data Sovereignty
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Gain uncompromising clarity over every dollar. Eliminate wasteful spending, automate compounding savings targets, and let proactive intelligence guide your wealth accumulation.
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Bank-Grade Encryption
                </span>
                <span className="text-emerald-400 font-semibold">100% Private & Persistent</span>
              </div>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
                <TrendingUp className="w-4 h-4 text-emerald-400 mb-1.5 stroke-[2.2]" />
                <div className="text-xs font-bold text-white">Live Cashflow Analytics</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Multi-stream income & recurring bills</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
                <Target className="w-4 h-4 text-teal-400 mb-1.5 stroke-[2.2]" />
                <div className="text-xs font-bold text-white">Target Milestone Engine</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Visual progress & pacing analytics</div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-7">
            <div
              id="auth_gateway_card"
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden"
            >
              {/* Decorative Accent Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
                <button
                  id="tab_gateway_login"
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMessage(null);
                  }}
                  className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'login'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </button>

                <button
                  id="tab_gateway_register"
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMessage(null);
                  }}
                  className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'register'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Register
                </button>
              </div>

              {/* Status & Error Alerts */}
              {errorMessage && (
                <div
                  id="gateway_error_alert"
                  className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div
                  id="gateway_success_alert"
                  className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* TAB 1: SIGN IN FORM */}
              {activeTab === 'login' && !forgotMode && (
                <form id="form_gateway_login" onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white">Sign In to Your Vault</h2>
                    <p className="text-xs text-slate-400">
                      Enter your login credentials to access your financial records.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Email Address / Login ID
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_login_email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. demo@finora.io or sarah@finora.io"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_login_password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setForgotEmail(loginEmail);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    id="btn_gateway_submit_login"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" /> Sign In & Unlock Vault
                      </>
                    )}
                  </button>

                  {/* Switch to Register link */}
                  <div className="pt-2 text-center text-xs text-slate-400">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      Register here →
                    </button>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD FLOW */}
              {activeTab === 'login' && forgotMode && (
                <div className="space-y-4">
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white">Reset Your Password</h2>
                    <p className="text-xs text-slate-400">
                      Verify your email with a 6-digit code and choose a new password.
                    </p>
                  </div>

                  {forgotStep === 'email' && (
                    <form onSubmit={handleForgotRequest} className="space-y-4">
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Enter your registered email and we'll send you a 6-digit reset code, valid for 15 minutes.</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">Email Address</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            autoFocus
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        {loading ? 'Sending…' : 'Send Reset Code'}
                      </button>
                    </form>
                  )}

                  {forgotStep === 'reset' && (
                    <form onSubmit={handleResetSubmit} className="space-y-4">
                      {devCode && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                          <p className="font-bold">Development mode — no email server configured</p>
                          <p className="mt-1">Your reset code is: <span className="font-black tracking-[0.3em] text-base">{devCode}</span></p>
                          <p className="mt-1 opacity-70">Once SMTP email is configured, this code will be delivered to your inbox instead.</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">Reset Code</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          inputMode="numeric"
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="6-digit code"
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white text-center tracking-[0.4em] placeholder-slate-500 placeholder:tracking-normal focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">New Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {loading ? 'Resetting…' : 'Reset Password'}
                      </button>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={exitForgotMode}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}

              {/* TAB 2: REGISTRATION FORM */}
              {activeTab === 'register' && (
                <form id="form_gateway_register" onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white">Create Your Account</h2>
                    <p className="text-xs text-slate-400">
                      Register once — you'll land directly in your FINORA dashboard.
                    </p>
                  </div>

                  {/* Profile photo picker */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 p-[2px] shadow-[0_0_14px_rgba(16,185,129,0.3)]">
                        <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                          {regAvatar ? (
                            <img src={regAvatar} alt="Profile preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-black text-emerald-400">
                              {regName.trim() ? regName.trim().charAt(0).toUpperCase() : '?'}
                            </span>
                          )}
                        </div>
                      </div>
                      <label className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center text-slate-950 cursor-pointer shadow-md transition-colors">
                        <Camera className="w-3 h-3" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleRegAvatarPick} />
                      </label>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Profile Photo</p>
                      <p className="text-[10px] text-slate-400">Optional — auto-cropped to a circle. Change it anytime in Profile Center.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_register_name"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Sahad (RUET CSE)"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Login Email / ID *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_register_email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. demo@finora.io or you@example.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Create Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_register_password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_register_confirm_password"
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Profession */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Profession / Occupation
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_register_profession"
                        type="text"
                        value={regProfession}
                        onChange={(e) => setRegProfession(e.target.value)}
                        placeholder="e.g. Software Engineer, Student, Doctor"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* University/College — conditional on Student role */}
                  {regRole === 'University Student' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                        University / College *
                      </label>
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input_gateway_register_university"
                          type="text"
                          value={regUniversity}
                          onChange={(e) => setRegUniversity(e.target.value)}
                          placeholder="e.g. RUET, MIT, Dhaka University"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Phone + City row */}
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input_gateway_register_phone"
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+880 1XXX-XXXXXX"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        City / Location
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input_gateway_register_city"
                          type="text"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          placeholder="e.g. Dhaka, New York"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-left">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input_gateway_register_dob"
                        type="date"
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Account Type
                      </label>
                      <select
                        id="select_gateway_role"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="University Student"> Student (University / College)</option>
                        <option value="Salaried Employee"> Salaried Employee</option>
                        <option value="Freelancer"> Freelancer / Self-employed</option>
                        <option value="Small Business Owner"> Business Owner</option>
                        <option value="Family Household"> Family / Household</option>
                        <option value="Individual"> Individual / Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Currency
                      </label>
                      <select
                        id="select_gateway_currency"
                        value={regCurrency}
                        onChange={(e) => setRegCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="BDT">BDT (Tk)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Monthly Income Target
                      </label>
                      <input
                        id="input_gateway_income_target"
                        type="number"
                        step="50"
                        value={regIncomeTarget}
                        onChange={(e) => setRegIncomeTarget(e.target.value)}
                        placeholder="1800"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Monthly Expense Budget
                      </label>
                      <input
                        id="input_gateway_expense_budget"
                        type="number"
                        step="50"
                        value={regExpenseBudget}
                        onChange={(e) => setRegExpenseBudget(e.target.value)}
                        placeholder="1200"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    id="btn_gateway_submit_register"
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
                        <UserPlus className="w-4 h-4" /> Register & Go to Sign In
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      Sign In here →
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4.5 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              FINORA
            </span>
            <span className="text-slate-400">— Precision Wealth & Personal Finance Intelligence System</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>Disk JSON Database</span>
            <span>•</span>
            <span>PBKDF2 Password Security</span>
            <span>•</span>
            <span>Encrypted Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
