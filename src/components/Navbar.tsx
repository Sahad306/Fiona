import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Target,
  Bell,
  CheckCheck,
  Trash2,
  ChevronDown,
  User,
  LogOut,
  RefreshCw,
  Download,
  Menu,
  X,
  Building2,
  GraduationCap,
  Briefcase,
  Store,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Database,
  LogIn,
  UserPlus,
  CloudCheck,
  Zap,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ProfileEditModal from './ProfileEditModal';
import { useFinance } from '../context/FinanceContext';


interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuthModal: (tab?: 'login' | 'register') => void;
  onOpenSmartImport: () => void;
  onSignOut?: () => void;
}

const CURRENCIES = [
  { code: 'BDT', symbol: 'Tk', label: 'BDT (Tk Bangladeshi Taka)' },
  { code: 'USD', symbol: '$', label: 'USD ($ US Dollar)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€ Euro)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£ British Pound)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$ Canadian Dollar)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$ Australian Dollar)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹ Rupee)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥ Yen)' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuthModal,
  onOpenSmartImport,
  onSignOut,
}) => {
  const {
    profile,
    updateProfile,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    resetCurrentProfile,
    exportJSON,
    summary,
    formatCurrency,
    currentUser,
    isAuthenticated,
    logout,
    syncDatabase,
  } = useFinance();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: string; label: string; icon: LucideIcon; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'income', label: 'Income', icon: ArrowUpRight },
    { id: 'expenses', label: 'Expenses', icon: ArrowDownRight },
    { id: 'budget-goals', label: 'Budgets & Goals', icon: Target },
    { id: 'reports-ai', label: 'Reports And AI Advisor', icon: FileText },
  ];

  return (
    <>
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-sm" id="finora-navbar">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-4 lg:space-x-6 min-w-0 flex-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center space-x-3 text-left focus:outline-none group cursor-pointer shrink-0"
              id="finora-brand-logo"
            >
              {/* Precision Designed Emblem Logo */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/35 transition-all">
                  <div className="w-full h-full bg-slate-950/95 rounded-[11px] flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 via-transparent to-cyan-500/15" />
                    <Wallet className="w-5 h-5 text-emerald-400 stroke-[2.2] relative z-10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full blur-[2px] opacity-70" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-300">
                    FINORA
                  </span>
                  <span className="text-[9px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Vault OS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
                  Wealth Architecture & Intelligence
                </p>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-1 min-w-0 overflow-x-auto no-scrollbar" id="desktop-nav-menu">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`shrink-0 flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="hidden 2xl:inline">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 ml-1 hidden 2xl:inline">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Smart Import Button */}
            <button
              id="smart-import-btn"
              onClick={() => onOpenSmartImport()}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold shadow-md shadow-violet-500/25 transition-all active:scale-95 cursor-pointer"
              title="Import Bank / bKash / Nagad transactions"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Smart Import</span>
              <span className="sm:hidden">Import</span>
            </button>

            {/* Currency Selector */}
            <div className="relative hidden xl:block">
              <select
                id="currency-selector"
                value={profile.currency}
                onChange={(e) => {
                  const found = CURRENCIES.find((c) => c.code === e.target.value);
                  if (found) {
                    updateProfile({ currency: found.code, currencySymbol: found.symbol });
                  }
                }}
                className="bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Popover Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                id="notifications-bell-btn"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div
                  id="notifications-dropdown"
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Notifications ({notifications.length})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {unreadNotificationCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Mark read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Clear all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                        No notifications yet. You're all caught up!
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationAsRead(notif.id)}
                          className={`p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                            notif.read ? 'bg-slate-900/40 hover:bg-slate-850' : 'bg-slate-800/40 hover:bg-slate-800/70 border-l-2 border-emerald-400'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            {notif.severity === 'danger' ? (
                              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                            ) : notif.severity === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            ) : notif.severity === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className={`text-xs font-semibold ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Account / Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                id="user-profile-btn"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors text-left cursor-pointer border border-transparent hover:border-slate-700"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs overflow-hidden">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    profile.name ? profile.name.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                    {profile.name}
                    {isAuthenticated && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium">{profile.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div
                  id="profile-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-2 text-xs"
                >
                  <div className="px-3 py-2.5 border-b border-slate-800 mb-1.5 bg-slate-950/60 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-sm">{profile.name}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        {isAuthenticated ? 'Logged In' : 'Registered'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{profile.email}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80">
                      <span>Monthly Balance:</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(summary.remainingBalance)}</span>
                    </div>
                  </div>

                  {/* Auth Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2 px-1">
                    <button
                      id="menu-btn-signin"
                      onClick={() => {
                        onOpenAuthModal('login');
                        setIsProfileMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                    <button
                      id="menu-btn-register"
                      onClick={() => {
                        onOpenAuthModal('register');
                        setIsProfileMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] cursor-pointer transition-colors border border-slate-700"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register</span>
                    </button>
                  </div>

                  <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-1">
                    <p className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {profile.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {profile.role} · {profile.currency} ({profile.currencySymbol})
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-300">
                      <span>Target: <b className="text-emerald-400">{formatCurrency(profile.monthlyIncomeTarget ?? 0)}</b></span>
                      <span>Budget: <b className="text-amber-400">{formatCurrency(profile.monthlyExpenseBudget ?? 0)}</b></span>
                    </div>
                    <button
                      id="menu-btn-edit-profile"
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsProfileMenuOpen(false);
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      View & Edit Profile
                    </button>
                  </div>

                  <div className="border-t border-slate-800 my-1 pt-1 space-y-0.5">
                    <button
                      onClick={() => {
                        syncDatabase();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sync Data to Cloud Database</span>
                    </button>

                    <button
                      onClick={() => {
                        resetCurrentProfile();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset Local Data</span>
                    </button>

                    <button
                      onClick={() => {
                        exportJSON();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Export JSON Backup</span>
                    </button>

                    <button
                      onClick={async () => {
                        await logout();
                        setIsProfileMenuOpen(false);
                        onSignOut?.();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-left cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              id="mobile-nav-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="xl:hidden py-3 border-t border-slate-800 space-y-1" id="mobile-nav-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    isActive ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Sign Out in mobile menu */}
            <div className="border-t border-slate-800 mt-2 pt-2">
              <button
                onClick={async () => {
                  await logout();
                  setIsMobileMenuOpen(false);
                  onSignOut?.();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>

    {/* Rendered OUTSIDE <header> — backdrop-blur-md on the header creates a containing
        block for fixed-position descendants, which pushed this modal off-screen. */}
    <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
};
