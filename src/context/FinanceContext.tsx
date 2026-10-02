import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UserProfile,
  Transaction,
  Budget,
  SavingsGoal,
  AppNotification,
  FinancialSummary,
  AuthUser,
  UserRole,
  SavedReport,
} from '../types';
import { ProfileData } from '../data/defaultData';

interface FinanceContextType {
  profile: UserProfile;
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  activeProfileKey: string;
  summary: FinancialSummary;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;

  // Authentication & Database State
  currentUser: AuthUser | null;
  authToken: string | null;
  isAuthenticated: boolean;
  isDbSyncing: boolean;
  dbLastSynced: string | null;
  isDbConnected: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    params: {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      currency: string;
      monthlyIncomeTarget?: number;
      monthlyExpenseBudget?: number;
    },
    autoLogin?: boolean
  ) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  syncDatabase: () => Promise<boolean>;
  verifyPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changeEmail: (password: string, newEmail: string) => Promise<{ success: boolean; error?: string }>;
  updateAccountProfile: (fields: {
    name?: string;
    role?: UserRole;
    currency?: string;
    currencySymbol?: string;
    monthlyIncomeTarget?: number;
    monthlyExpenseBudget?: number;
    phone?: string;
    location?: string;
    occupation?: string;
    bio?: string;
    financialGoal?: string;
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    avatarUrl?: string;
    university?: string;
    program?: string;
    degree?: string;
    year?: string;
    semester?: string;
    studentId?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  // Profile management
  switchProfile: (profileKey: string) => void;
  updateProfile: (updated: Partial<UserProfile>) => void;
  resetCurrentProfile: () => void;

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  addMultipleTransactions: (txs: Array<Omit<Transaction, 'id' | 'createdAt'>>) => Transaction[];
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Budgets
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  // Savings Goals
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'contributions'>) => void;
  updateSavingsGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  contributeToGoal: (goalId: string, amount: number, note?: string) => void;
  withdrawFromGoal: (goalId: string, amount: number) => void;

  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Report Archive
  savedReports: SavedReport[];
  saveCurrentReport: () => Promise<{ success: boolean }>;
  deleteSavedReport: (id: string) => void;
  autoSavePreviousMonth: () => void;

  // Data Utilities
  exportCSV: (type?: 'all' | 'income' | 'expense') => void;
  exportJSON: () => void;
  importJSON: (jsonData: string) => boolean;
  formatCurrency: (amount: number) => string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'finora_v2_';
const AUTH_TOKEN_KEY = 'finora_auth_token';
const AUTH_USER_KEY = 'finora_auth_user';

// Collision-safe id generator (Date.now() alone collides on bulk creates).
const createId = (prefix: string, salt = ''): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${salt}${Math.random().toString(36).slice(2, 10)}`;
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProfileKey, setActiveProfileKey] = useState<string>(() => {
    return localStorage.getItem('finora_active_profile') || 'default';
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [dbLastSynced, setDbLastSynced] = useState<string | null>(() => {
    return localStorage.getItem('finora_db_last_sync') || new Date().toISOString();
  });
  const [isDbConnected, setIsDbConnected] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Load initial data for active profile
  const initialData: ProfileData = useMemo(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${activeProfileKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state, using preset fallback', e);
      }
    }
    return {
      profile: {
        id: currentUser?.id || 'local_registered_user',
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        role: currentUser?.role || 'Individual',
        currency: 'BDT',
        currencySymbol: 'Tk',
        monthlyIncomeTarget: 0,
        monthlyExpenseBudget: 0,
        joinedDate: new Date().toISOString().split('T')[0],
      },
      transactions: [],
      budgets: [],
      savingsGoals: [],
      notifications: [],
      savedReports: [],
    };
  }, [activeProfileKey, currentUser]);

  const [profile, setProfile] = useState<UserProfile>(initialData.profile);
  const [transactions, setTransactions] = useState<Transaction[]>(initialData.transactions);
  const [budgets, setBudgets] = useState<Budget[]>(initialData.budgets);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(initialData.savingsGoals);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialData.notifications);
  const [savedReports, setSavedReports] = useState<SavedReport[]>(initialData.savedReports || []);

  // Sync ref to debounce database API calls
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Prevents writing data back to the server right after it was loaded on login/register.
  const skipNextSyncRef = useRef(false);
  // Guards against the mount race: without a completed server load, the autosave effect
  // would push EMPTY state to /api/db/sync and wipe the user's data (e.g. on page reload).
  const hasLoadedServerDataRef = useRef(false);
  // Prevents autosave from writing empty/stale state during logout transition.
  const isLoggingOutRef = useRef(false);
  // Tracks whether the initial server data load is still in progress.
  const isLoadingServerDataRef = useRef(false);

  // Load user data from server database if token exists
  useEffect(() => {
    async function fetchUserData() {
      if (!authToken) return;
      isLoadingServerDataRef.current = true;
      try {
        setIsDbSyncing(true);
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
          }
          if (data.userData) {
            if (data.userData.profile) setProfile(data.userData.profile);
            if (data.userData.transactions) setTransactions(data.userData.transactions);
            if (data.userData.budgets) setBudgets(data.userData.budgets);
            if (data.userData.savingsGoals) setSavingsGoals(data.userData.savingsGoals);
            if (data.userData.notifications) setNotifications(data.userData.notifications);
            const now = new Date().toISOString();
            setDbLastSynced(now);
            localStorage.setItem('finora_db_last_sync', now);
          }
          setIsDbConnected(true);
          // Server load completed — autosave to the server is now safe.
          hasLoadedServerDataRef.current = true;
        } else if (res.status === 401) {
          // Token expired
          setAuthToken(null);
          setCurrentUser(null);
          hasLoadedServerDataRef.current = false;
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
        }
      } catch (err) {
        console.warn('Could not sync with remote database on load, using local cache:', err);
        setIsDbConnected(false);
        // DO NOT set hasLoadedServerDataRef = true here.
        // If the fetch failed, we don't know what the server has.
        // Keeping it false blocks autosave from pushing empty mount state.
        // Autosave will remain blocked until a successful load or fresh login.
      } finally {
        setIsDbSyncing(false);
        isLoadingServerDataRef.current = false;
      }
    }

    fetchUserData();
  }, [authToken]);

  // Sync state whenever active demo profile changes
  // ponytail: preset profiles removed — only registered accounts allowed. Kept as no-op to preserve interface.
  const switchProfile = useCallback((_profileKey: string) => {
    // no-op: demo profiles removed
  }, []);

  // Save current profile data to localStorage on changes
  useEffect(() => {
    const dataToSave: ProfileData = {
      profile,
      transactions,
      budgets,
      savingsGoals,
      notifications,
      savedReports,
    };
    // Block ALL persistence during logout transition to prevent empty/stale state bleed
    if (isLoggingOutRef.current) return;
    // Block autosave while initial server data is still loading
    if (isLoadingServerDataRef.current) return;

    // When authenticated, server DB is the source of truth - do not write to shared localStorage keys
    if (!authToken) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${activeProfileKey}`, JSON.stringify(dataToSave));
    }
    // Debounced sync to server database if authenticated
    if (authToken) {
      // Skip the write-back that fires immediately after login/register loaded server data.
      if (skipNextSyncRef.current) {
        skipNextSyncRef.current = false;
        return;
      }
      // CRITICAL: never push to the server before the initial server load completed,
      // otherwise empty mount state would overwrite the user's real data.
      if (!hasLoadedServerDataRef.current) {
        return;
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          setIsDbSyncing(true);
          const res = await fetch('/api/db/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(dataToSave),
          });

          if (res.ok) {
            const now = new Date().toISOString();
            setDbLastSynced(now);
            localStorage.setItem('finora_db_last_sync', now);
            setIsDbConnected(true);
          }
        } catch (e) {
          console.warn('Database background sync failed:', e);
          setIsDbConnected(false);
        } finally {
          setIsDbSyncing(false);
        }
      }, 1000);
    }
  }, [activeProfileKey, profile, transactions, budgets, savingsGoals, notifications, authToken]);

  // Manual database sync — works for both server-backed and local-only modes
  const syncDatabase = useCallback(async (): Promise<boolean> => {
    setIsDbSyncing(true);
    const dataToSave: ProfileData = {
      profile,
      transactions,
      budgets,
      savingsGoals,
      notifications,
      savedReports,
    };

    try {
      // Always persist locally as the reliable source
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${activeProfileKey}`, JSON.stringify(dataToSave));

      // If authenticated, also push to server
      if (authToken) {
        try {
          const res = await fetch('/api/db/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(dataToSave),
          });
          if (res.ok) {
            setIsDbConnected(true);
          } else {
            setIsDbConnected(false);
          }
        } catch {
          // Server unreachable — local save still succeeded
          setIsDbConnected(false);
        }
      } else {
        // Local mode — mark as connected since localStorage is reliable
        setIsDbConnected(true);
      }

      const now = new Date().toISOString();
      setDbLastSynced(now);
      localStorage.setItem('finora_db_last_sync', now);
      return true;
    } catch (err) {
      console.error('Sync error:', err);
      return false;
    } finally {
      setIsDbSyncing(false);
    }
  }, [activeProfileKey, authToken, profile, transactions, budgets, savingsGoals, notifications]);

  // Authentication: Register
  const register = useCallback(
    async (
      params: {
        email: string;
        password: string;
        name: string;
        role: UserRole;
        currency: string;
        monthlyIncomeTarget?: number;
        monthlyExpenseBudget?: number;
        phone?: string;
        occupation?: string;
        university?: string;
        program?: string;
        degree?: string;
        year?: string;
        semester?: string;
        studentId?: string;
        bio?: string;
        location?: string;
        financialGoal?: string;
        avatarUrl?: string;
      },
      autoLogin = false
    ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      try {
        setIsDbSyncing(true);
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Registration failed' };
        }

        if (autoLogin) {
          // Re-enable autosave (was blocked during previous logout)
          isLoggingOutRef.current = false;

          setAuthToken(data.token);
          setCurrentUser(data.user);
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

          if (data.userData) {
            setProfile(data.userData.profile);
            setTransactions(data.userData.transactions || []);
            setBudgets(data.userData.budgets || []);
            setSavingsGoals(data.userData.savingsGoals || []);
            setNotifications(data.userData.notifications || []);
          }
          // Server data is now in state — autosave to the server is safe from here on.
          hasLoadedServerDataRef.current = true;

          // Clear stale guest localStorage data to prevent cross-user bleed on reload
          Object.keys(localStorage).forEach(k => { if (k.startsWith("finora_v2_")) localStorage.removeItem(k); });

          const now = new Date().toISOString();
          setDbLastSynced(now);
          localStorage.setItem('finora_db_last_sync', now);
        }

        setIsDbConnected(true);
        // Server data was just loaded on auto-login; skip the immediate write-back sync.
        if (autoLogin) skipNextSyncRef.current = true;
        return { success: true, user: data.user };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error occurred during registration.' };
      } finally {
        setIsDbSyncing(false);
      }
    },
    []
  );

  // Authentication: Login
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsDbSyncing(true);
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Authentication failed' };
        }

        // Re-enable autosave (was blocked during previous logout)
        isLoggingOutRef.current = false;

        setAuthToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

        if (data.userData) {
          setProfile(data.userData.profile);
          setTransactions(data.userData.transactions || []);
          setBudgets(data.userData.budgets || []);
          setSavingsGoals(data.userData.savingsGoals || []);
          setNotifications(data.userData.notifications || []);
        }
        // Server data is now in state — autosave to the server is safe from here on.
        hasLoadedServerDataRef.current = true;

        // Clear stale guest localStorage data to prevent cross-user bleed on reload
        Object.keys(localStorage).forEach(k => { if (k.startsWith("finora_v2_")) localStorage.removeItem(k); });

        const now = new Date().toISOString();
        setDbLastSynced(now);
        localStorage.setItem('finora_db_last_sync', now);
        setIsDbConnected(true);

        // Server data was just loaded; skip the immediate write-back sync.
        skipNextSyncRef.current = true;

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error occurred during login.' };
      } finally {
        setIsDbSyncing(false);
      }
    },
    []
  );

  // Authentication: Logout
  const logout = useCallback(async () => {
    // Block autosave immediately before any state changes
    isLoggingOutRef.current = true;
    // Cancel any pending debounced sync to prevent stale data push
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Ignore logout network error
      }
    }
    setAuthToken(null);
    setCurrentUser(null);
    // Reset in-memory state so the next login starts clean instead of leaking
    // this user's data into the guest/localStorage slot.
    setProfile({
      id: 'local_registered_user',
      name: '',
      email: '',
      role: 'Individual',
      currency: 'BDT',
      currencySymbol: 'Tk',
      monthlyIncomeTarget: 0,
      monthlyExpenseBudget: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    });
    setTransactions([]);
    setBudgets([]);
    setSavingsGoals([]);
    setNotifications([]);
    hasLoadedServerDataRef.current = false;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    // Remove any stale guest cache so a returning guest starts fresh, not with this user's leftovers.
    Object.keys(localStorage).forEach(k => { if (k.startsWith("finora_v2_")) localStorage.removeItem(k); });
  }, [authToken]);

  // Delete Account
  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!authToken) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { Authorization: "Bearer " + authToken },
      });
      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Failed to delete account' };
      }
      setAuthToken(null);
      setCurrentUser(null);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      Object.keys(localStorage).forEach(k => { if (k.startsWith('finora_v2_')) localStorage.removeItem(k); });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, [authToken]);

  // Password gate for profile editing
  const verifyPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      if (!authToken) return { success: false, error: 'Not authenticated' };
      try {
        const res = await fetch('/api/auth/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const data = await res.json();
          return { success: false, error: data.error || 'Password verification failed' };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    },
    [authToken]
  );

  // Update registered account profile (server-persisted)
  const updateAccountProfile = useCallback(
    async (fields: {
      name?: string;
      role?: UserRole;
      currency?: string;
      currencySymbol?: string;
      monthlyIncomeTarget?: number;
      monthlyExpenseBudget?: number;
      phone?: string;
      location?: string;
      occupation?: string;
    bio?: string;
    financialGoal?: string;
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
      avatarUrl?: string;
      university?: string;
      program?: string;
      degree?: string;
      year?: string;
      semester?: string;
      studentId?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!authToken) return { success: false, error: 'Not authenticated' };
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to update profile' };
        }
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        }
        if (data.userData?.profile) {
          setProfile(data.userData.profile);
          skipNextSyncRef.current = true;
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    },
    [authToken]
  );

  // Change account password (server-persisted; keeps current session alive)
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      if (!authToken) return { success: false, error: 'Not authenticated' };
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error || 'Failed to change password' };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    },
    [authToken]
  );

  // Change account email (server-persisted; password-gated)
  const changeEmail = useCallback(
    async (password: string, newEmail: string): Promise<{ success: boolean; error?: string }> => {
      if (!authToken) return { success: false, error: 'Not authenticated' };
      try {
        const res = await fetch('/api/auth/change-email', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ password, newEmail }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error || 'Failed to change email' };
        if (data.user && currentUser) {
          const updatedUser = { ...currentUser, email: data.user.email };
          setCurrentUser(updatedUser);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        }
        if (data.userData?.profile) {
          setProfile(data.userData.profile);
          skipNextSyncRef.current = true;
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    },
    [authToken, currentUser]
  );

  // Currency Formatter
  const formatCurrency = useCallback(
    (amount: number) => {
      const sym = profile.currencySymbol || '$';
      const hasDecimals = amount % 1 !== 0;
      const formatted = Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: hasDecimals ? 2 : 0,
        maximumFractionDigits: 2,
      });
      return amount < 0 ? `-${sym}${formatted}` : `${sym}${formatted}`;
    },
    [profile.currencySymbol]
  );

  // Filter transactions for current month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Compute Financial Summary
  const summary: FinancialSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals: Record<string, number> = {};
    const sourceTotals: Record<string, number> = {};

    monthlyTransactions.forEach((tx) => {
      // Savings transfers move cash between pockets — never income or expense.
      if (tx.savingsTransfer) return;
      if (tx.type === 'income') {
        totalIncome += tx.amount;
        sourceTotals[tx.category] = (sourceTotals[tx.category] || 0) + tx.amount;
      } else {
        totalExpenses += tx.amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      }
    });

    const remainingBalance = totalIncome - totalExpenses;
    const monthlySavings = remainingBalance > 0 ? remainingBalance : 0;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((remainingBalance / totalIncome) * 100)) : 0;

    const topExpenseCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const incomeSourcesBreakdown = Object.entries(sourceTotals)
      .map(([source, amount]) => ({
        source,
        amount,
        percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const overallBudget = budgets.find((b) => b.category === 'Overall')?.limitAmount || profile.monthlyExpenseBudget || 3000;
    const budgetUtilization = {
      totalBudget: overallBudget,
      totalSpent: totalExpenses,
      percentage: overallBudget > 0 ? Math.min(200, Math.round((totalExpenses / overallBudget) * 100)) : 0,
      remaining: overallBudget - totalExpenses,
    };

    /* ── Financial Health Score (0-100) — STRICT scoring ──
       EARN (max 100):
       - Savings rate (35 pts): 25%+ of income saved = full marks, scales down to 0
       - Budget discipline (25 pts): full marks ONLY while spending stays within budget
       - Positive cash flow (25 pts): income > expenses = full, shrinks with the shortfall
       - Goal progress (15 pts): average progress across savings goals (neutral 5 if none set)
       LOSE (subtracted from your earned total):
       - Over budget: -1 pt per 1% past 100% utilization (up to -30)
       - Negative cash flow: flat -10 when expenses exceed income
       - Zero savings: -5 when income is recorded but nothing was saved
    */
    const savingsRatePts = Math.min(35, (savingsRate / 25) * 35);
    const budgetPct = budgetUtilization.percentage;
    const budgetPts = budgetPct <= 100 ? 25 : 0;
    const overBudgetPenalty = budgetPct > 100 ? Math.min(30, Math.round(budgetPct - 100)) : 0;
    const cashFlowPts = totalIncome > 0
      ? (remainingBalance >= 0 ? 25 : Math.max(0, 25 + (remainingBalance / totalIncome) * 25))
      : 10; // no income recorded yet — neutral
    const negativeCashPenalty = totalIncome > 0 && remainingBalance < 0 ? 10 : 0;
    const noSavingsPenalty = totalIncome > 0 && savingsRate === 0 ? 5 : 0;
    // Category budgets (Rent, Food, etc.) count too: each breached category costs
    // -5 base, plus -1 per full 25% over its limit, capped at -15 per category / -30 total.
    const categoryOverBudgetPenalty = Math.min(30, budgets
      .filter((b) => b.category !== 'Overall' && b.limitAmount > 0)
      .reduce((penalty, b) => {
        const spent = categoryTotals[b.category] || 0;
        if (spent <= b.limitAmount) return penalty;
        const overPct = ((spent - b.limitAmount) / b.limitAmount) * 100;
        return penalty + Math.min(15, 5 + Math.floor(overPct / 25));
      }, 0));
    const goalProgressPts = savingsGoals.length > 0
      ? (savingsGoals.reduce((s, g) => s + Math.min(1, g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0), 0) / savingsGoals.length) * 15
      : 5;
    const financialHealthScore = Math.round(
      Math.max(0, Math.min(100,
        savingsRatePts + budgetPts + cashFlowPts + goalProgressPts
        - overBudgetPenalty - negativeCashPenalty - noSavingsPenalty
        - categoryOverBudgetPenalty
      ))
    );

    const financialHealthBreakdown = [
      { label: 'Savings rate', points: Math.round(savingsRatePts * 10) / 10, max: 35, note: `${savingsRate}% saved (25%+ = full marks)` },
      { label: 'Budget discipline', points: budgetPts, max: 25, note: budgetPct <= 100 ? `${budgetPct}% of budget used` : `Budget exceeded (${budgetPct}%) — 0 pts` },
      { label: 'Positive cash flow', points: Math.round(cashFlowPts * 10) / 10, max: 25, note: totalIncome > 0 ? (remainingBalance >= 0 ? 'Spending below income' : 'Spending exceeds income') : 'No income recorded (neutral)' },
      { label: 'Goal progress', points: Math.round(goalProgressPts * 10) / 10, max: 15, note: savingsGoals.length > 0 ? `${savingsGoals.length} active goal(s)` : 'No goals set (neutral)' },
      { label: 'Penalty: overall over-budget', points: -overBudgetPenalty, max: 0, note: budgetPct > 100 ? `${budgetPct - 100}% over overall budget (−1/%)` : 'None' },
      { label: 'Penalty: category budgets over', points: -categoryOverBudgetPenalty, max: 0, note: '−5 per breached category + −1 per 25% over' },
      { label: 'Penalty: negative cash flow', points: -negativeCashPenalty, max: 0, note: negativeCashPenalty ? 'Expenses exceeded income' : 'None' },
      { label: 'Penalty: zero savings', points: -noSavingsPenalty, max: 0, note: noSavingsPenalty ? 'Income recorded but nothing saved' : 'None' },
    ];

    return {
      totalIncome,
      totalExpenses,
      remainingBalance,
      monthlySavings,
      savingsRate,
      financialHealthScore,
      financialHealthBreakdown,
      topExpenseCategories,
      incomeSourcesBreakdown,
      budgetUtilization,
    };
  }, [monthlyTransactions, budgets, profile.monthlyExpenseBudget, savingsGoals]);

  // Check budget limits and generate notifications on expense creation
  const checkBudgetThresholds = useCallback(
    (newTx: Transaction, currentTransactions: Transaction[]) => {
      if (newTx.type !== 'expense') return;

      const categoryBudget = budgets.find((b) => b.category === newTx.category);
      if (!categoryBudget) return;

      // Calculate total category spend for month
      const currentCategorySpend = currentTransactions
        .filter((t) => t.type === 'expense' && t.category === newTx.category && t.date.startsWith(selectedMonth))
        .reduce((sum, t) => sum + t.amount, 0) + newTx.amount;

      const ratio = (currentCategorySpend / categoryBudget.limitAmount) * 100;

      if (ratio >= 100) {
        const notif: AppNotification = {
          id: createId('notif'),
          type: 'budget_exceeded',
          title: `Budget Exceeded: ${newTx.category}`,
          message: `You spent ${formatCurrency(currentCategorySpend)}, exceeding your ${formatCurrency(categoryBudget.limitAmount)} limit by ${formatCurrency(currentCategorySpend - categoryBudget.limitAmount)}.`,
          timestamp: new Date().toISOString(),
          read: false,
          severity: 'danger',
          relatedCategory: newTx.category,
        };
        setNotifications((prev) => [notif, ...prev]);
      } else if (ratio >= (categoryBudget.alertThreshold || 80)) {
        const notif: AppNotification = {
          id: createId('notif'),
          type: 'budget_limit_close',
          title: `Budget Warning: ${newTx.category}`,
          message: `You have reached ${Math.round(ratio)}% of your monthly budget for ${newTx.category} (${formatCurrency(currentCategorySpend)} of ${formatCurrency(categoryBudget.limitAmount)}).`,
          timestamp: new Date().toISOString(),
          read: false,
          severity: 'warning',
          relatedCategory: newTx.category,
        };
        setNotifications((prev) => [notif, ...prev]);
      }
    },
    [budgets, selectedMonth, formatCurrency]
  );

  // Add Transaction
  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
      const newTransaction: Transaction = {
        ...tx,
        id: createId('tx'),
        createdAt: new Date().toISOString(),
      };

      // Budget checks run outside the state updater (updaters must stay pure).
      checkBudgetThresholds(newTransaction, transactions);
      setTransactions((prev) => [newTransaction, ...prev]);

      return newTransaction;
    },
    [checkBudgetThresholds, transactions]
  );

  // Add Multiple Transactions at once (e.g. for bulk monthly sector additions)
  const addMultipleTransactions = useCallback(
    (txs: Array<Omit<Transaction, 'id' | 'createdAt'>>): Transaction[] => {
      const createdTxs: Transaction[] = txs.map((tx, idx) => ({
        ...tx,
        id: createId('tx', `${idx}_`),
        createdAt: new Date().toISOString(),
      }));

      // Budget checks run outside the state updater (updaters must stay pure).
      let runningList = transactions;
      createdTxs.forEach((tx) => {
        checkBudgetThresholds(tx, runningList);
        runningList = [tx, ...runningList];
      });
      setTransactions((prev) => [...createdTxs, ...prev]);

      return createdTxs;
    },
    [checkBudgetThresholds, transactions]
  );

  const updateTransaction = useCallback((id: string, updated: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, ...updated } : tx)));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  // Budget Management
  const addBudget = useCallback((b: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...b,
      id: createId('b'),
    };
    setBudgets((prev) => [...prev, newBudget]);
  }, []);

  const updateBudget = useCallback((id: string, updated: Partial<Budget>) => {
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Savings Goals Management
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if canvas isn't ready
    }
  };

  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id' | 'contributions'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: createId('sg'),
      contributions: [],
      completed: goal.currentAmount >= goal.targetAmount,
    };
    setSavingsGoals((prev) => [...prev, newGoal]);
  }, []);

  const updateSavingsGoal = useCallback((id: string, updated: Partial<SavingsGoal>) => {
    setSavingsGoals((prev) =>
      prev.map((goal) => {
        if (goal.id === id) {
          const next = { ...goal, ...updated };
          next.completed = next.currentAmount >= next.targetAmount;
          return next;
        }
        return goal;
      })
    );
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const contributeToGoal = useCallback(
    (goalId: string, amount: number, note?: string) => {
      // A deposit is a TRANSFER, not an expense: cash is deducted (balance drops),
      // the money counts as savings, and it never touches expense totals.
      const goal = savingsGoals.find((g) => g.id === goalId);
      if (goal) {
        const transferTx: Transaction = {
          id: createId('tx'),
          type: 'expense',
          category: 'Savings Transfer',
          description: `Deposit to savings goal: ${goal.name}`,
          amount,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Bank Transfer',
          savingsTransfer: true,
          notes: note,
          createdAt: new Date().toISOString(),
        };
        setTransactions((prev) => [transferTx, ...prev]);
      }
      setSavingsGoals((prev) =>
        prev.map((g) => {
          if (g.id === goalId) {
            const previousPercentage = Math.round((g.currentAmount / g.targetAmount) * 100);
            const newAmount = g.currentAmount + amount;
            const newPercentage = Math.round((newAmount / g.targetAmount) * 100);
            const isCompleted = newAmount >= g.targetAmount;

            const contribution = {
              id: createId('c'),
              amount,
              date: new Date().toISOString().split('T')[0],
              note: note || 'Contribution deposit',
            };

            // Milestone checks (25%, 50%, 75%, 100%)
            const milestones = [25, 50, 75, 100];
            for (const milestone of milestones) {
              if (previousPercentage < milestone && newPercentage >= milestone) {
                triggerCelebration();
                const notif: AppNotification = {
                  id: createId('notif'),
                  type: 'savings_milestone',
                  title: `Savings Milestone Reached! `,
                  message: `Congratulations! Your goal "${g.name}" has reached ${milestone}% (${formatCurrency(newAmount)} of ${formatCurrency(g.targetAmount)}).`,
                  timestamp: new Date().toISOString(),
                  read: false,
                  severity: 'success',
                  relatedGoalId: g.id,
                };
                setNotifications((nPrev) => [notif, ...nPrev]);
                break;
              }
            }

            return {
              ...g,
              currentAmount: newAmount,
              completed: isCompleted,
              contributions: [contribution, ...g.contributions],
            };
          }
          return g;
        })
      );
    },
    [savingsGoals, formatCurrency]
  );

  const withdrawFromGoal = useCallback((goalId: string, amount: number) => {
    // A withdrawal returns cash: it is NOT income, just money moving back to your balance.
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (goal) {
      const returnTx: Transaction = {
        id: createId('tx'),
        type: 'income',
        category: 'Savings Withdrawal',
        description: `Withdrawal from savings goal: ${goal.name}`,
        amount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        savingsTransfer: true,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [returnTx, ...prev]);
    }
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const newAmount = Math.max(0, g.currentAmount - amount);
          return {
            ...g,
            currentAmount: newAmount,
            completed: newAmount >= g.targetAmount,
          };
        }
        return g;
      })
    );
  }, [savingsGoals]);

  // Notifications Management
  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Report Archive Functions
  const autoSaveDoneRef = useRef(false);

  const buildSnapshot = useCallback((month: string): SavedReport | null => {
    const monthTxs = transactions.filter((tx) => tx.date.startsWith(month) && !tx.savingsTransfer);
    if (monthTxs.length === 0) return null;

    let inc = 0;
    let exp = 0;
    const catTotals: Record<string, number> = {};
    const srcTotals: Record<string, number> = {};

    monthTxs.forEach((tx) => {
      if (tx.type === 'income') {
        inc += tx.amount;
        srcTotals[tx.category] = (srcTotals[tx.category] || 0) + tx.amount;
      } else {
        exp += tx.amount;
        catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
      }
    });

    const net = inc - exp;
    const rate = inc > 0 ? Math.max(0, Math.round((net / inc) * 100)) : 0;

    const categoryBreakdown = Object.entries(catTotals)
      .map(([category, spent]) => ({
        category,
        spent,
        percentage: exp > 0 ? Math.round((spent / exp) * 100) : 0,
      }))
      .sort((a, b) => b.spent - a.spent);

    const incomeSources = Object.entries(srcTotals)
      .map(([source, amount]) => ({
        source,
        amount,
        percentage: inc > 0 ? Math.round((amount / inc) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      id: createId('rpt'),
      month,
      savedAt: new Date().toISOString(),
      totalIncome: inc,
      totalExpenses: exp,
      netSavings: net,
      savingsRate: rate,
      transactionCount: monthTxs.length,
      categoryBreakdown,
      incomeSources,
      transactions: monthTxs.map((t) => ({ ...t })),
    };
  }, [transactions]);

  const saveCurrentReport = useCallback(async (): Promise<{ success: boolean }> => {
    const snapshot = buildSnapshot(selectedMonth);
    if (!snapshot) return { success: false };
    // Replace existing report for same month (allows fixing broken snapshots)
    const filtered = savedReports.filter((r) => r.month !== selectedMonth);
    const updated = [snapshot, ...filtered];
    setSavedReports(updated);
    return { success: true };
  }, [buildSnapshot, selectedMonth, savedReports]);

  const deleteSavedReport = useCallback((id: string) => {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const autoSavePreviousMonth = useCallback(() => {
    if (autoSaveDoneRef.current) return;
    // CRITICAL: Don't auto-save until server data has fully loaded.
    // Otherwise we'd snapshot empty mount state and permanently save zeros.
    if (!hasLoadedServerDataRef.current && authToken) return;
    autoSaveDoneRef.current = true;

    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const alreadySaved = savedReports.some((r) => r.month === prevMonth);
    if (alreadySaved) return;

    const snapshot = buildSnapshot(prevMonth);
    if (snapshot) {
      setSavedReports((prev) => [snapshot, ...prev]);
    }
  }, [buildSnapshot, savedReports, authToken]);

  const updateProfile = useCallback((updated: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
  }, []);

  const resetCurrentProfile = useCallback(() => {
    setTransactions([]);
    setBudgets([]);
    setSavingsGoals([]);
    setNotifications([]);
  }, []);

  // Export Data to CSV
  const exportCSV = useCallback(
    (type: 'all' | 'income' | 'expense' = 'all') => {
      const filtered = transactions.filter((t) => (type === 'all' ? true : t.type === type));
      const headers = ['ID', 'Type', 'Category/Source', 'Description', 'Amount', 'Date', 'Payment Method', 'Recurring', 'Tags'];
      const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
      const rows = filtered.map((t) =>
        [
          t.id,
          t.type.toUpperCase(),
          escape(t.category),
          escape(t.description),
          t.amount,
          t.date,
          escape(t.paymentMethod),
          t.recurring || 'none',
          escape((t.tags || []).join(', ')),
        ].join(',')
      );

      // BOM prefix so Excel opens UTF-8 correctly; Blob avoids encodeURI data-URL limits.
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FINORA_Transactions_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [transactions]
  );

  // Export Data to JSON
  const exportJSON = useCallback(() => {
    const fullBackup: ProfileData = {
      profile,
      transactions,
      budgets,
      savingsGoals,
      notifications,
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `FINORA_Backup_${profile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [profile, transactions, budgets, savingsGoals, notifications]);

  // Import Data from JSON
  const importJSON = useCallback((jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData) as Partial<ProfileData>;
      if (!parsed || typeof parsed !== 'object') return false;
      if (!parsed.profile || typeof parsed.profile !== 'object') return false;
      if (!Array.isArray(parsed.transactions)) return false;

      // Drop malformed rows instead of corrupting state.
      const validTransactions = parsed.transactions.filter(
        (t) => t && typeof t.amount === 'number' && typeof t.type === 'string' && typeof t.date === 'string'
      );

      setProfile(parsed.profile);
      setTransactions(validTransactions);
      if (Array.isArray(parsed.budgets)) setBudgets(parsed.budgets);
      if (Array.isArray(parsed.savingsGoals)) setSavingsGoals(parsed.savingsGoals);
      if (Array.isArray(parsed.notifications)) setNotifications(parsed.notifications);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <FinanceContext.Provider
      value={{
        profile,
        transactions,
        budgets,
        savingsGoals,
        notifications,
        unreadNotificationCount,
        activeProfileKey,
        summary,
        selectedMonth,
        setSelectedMonth,
        currentUser,
        authToken,
        isAuthenticated: !!authToken,
        isDbSyncing,
        dbLastSynced,
        isDbConnected,
        login,
        register,
        logout,
        deleteAccount,
        syncDatabase,
        verifyPassword,
        updateAccountProfile,
        changePassword,
        changeEmail,
        switchProfile,
        updateProfile,
        resetCurrentProfile,
        addTransaction,
        addMultipleTransactions,
        updateTransaction,
        deleteTransaction,
        addBudget,
        updateBudget,
        deleteBudget,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        contributeToGoal,
        withdrawFromGoal,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        savedReports,
        saveCurrentReport,
        deleteSavedReport,
        autoSavePreviousMonth,
        exportCSV,
        exportJSON,
        importJSON,
        formatCurrency,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
