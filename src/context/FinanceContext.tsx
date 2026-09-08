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
} from '../types';
import { PRESET_PROFILES, ProfileData } from '../data/defaultData';

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
    return localStorage.getItem('finora_active_profile') || 'employee';
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
    return PRESET_PROFILES[activeProfileKey] || PRESET_PROFILES.employee;
  }, [activeProfileKey]);

  const [profile, setProfile] = useState<UserProfile>(initialData.profile);
  const [transactions, setTransactions] = useState<Transaction[]>(initialData.transactions);
  const [budgets, setBudgets] = useState<Budget[]>(initialData.budgets);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(initialData.savingsGoals);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialData.notifications);

  // Sync ref to debounce database API calls
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Prevents writing data back to the server right after it was loaded on login/register.
  const skipNextSyncRef = useRef(false);

  // Load user data from server database if token exists
  useEffect(() => {
    async function fetchUserData() {
      if (!authToken) return;
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
        } else if (res.status === 401) {
          // Token expired
          setAuthToken(null);
          setCurrentUser(null);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
        }
      } catch (err) {
        console.warn('Could not sync with remote database on load, using local cache:', err);
        setIsDbConnected(false);
      } finally {
        setIsDbSyncing(false);
      }
    }

    fetchUserData();
  }, [authToken]);

  // Sync state whenever active demo profile changes
  const switchProfile = useCallback((profileKey: string) => {
    // Demo archetypes are a guest feature; never blend them into a live authenticated session.
    if (authToken) return;
    setActiveProfileKey(profileKey);
    localStorage.setItem('finora_active_profile', profileKey);
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${profileKey}`);
    let data: ProfileData;
    try {
      data = saved ? JSON.parse(saved) : (PRESET_PROFILES[profileKey] || PRESET_PROFILES.employee);
    } catch {
      data = PRESET_PROFILES[profileKey] || PRESET_PROFILES.employee;
    }
    setProfile(data.profile);
    setTransactions(data.transactions);
    setBudgets(data.budgets);
    setSavingsGoals(data.savingsGoals);
    setNotifications(data.notifications);
  }, [authToken]);

  // Save current profile data to localStorage on changes
  useEffect(() => {
    const dataToSave: ProfileData = {
      profile,
      transactions,
      budgets,
      savingsGoals,
      notifications,
    };
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

  // Manual database sync
  const syncDatabase = useCallback(async (): Promise<boolean> => {
    if (!authToken) return false;
    try {
      setIsDbSyncing(true);
      const dataToSave: ProfileData = {
        profile,
        transactions,
        budgets,
        savingsGoals,
        notifications,
      };
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
        return true;
      }
      return false;
    } catch (err) {
      console.error('Manual sync error:', err);
      setIsDbConnected(false);
      return false;
    } finally {
      setIsDbSyncing(false);
    }
  }, [authToken, profile, transactions, budgets, savingsGoals, notifications]);

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
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
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

    return {
      totalIncome,
      totalExpenses,
      remainingBalance,
      monthlySavings,
      savingsRate,
      topExpenseCategories,
      incomeSourcesBreakdown,
      budgetUtilization,
    };
  }, [monthlyTransactions, budgets, profile.monthlyExpenseBudget]);

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
                  title: `Savings Milestone Reached! 🎉`,
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
    [formatCurrency]
  );

  const withdrawFromGoal = useCallback((goalId: string, amount: number) => {
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
  }, []);

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

  const updateProfile = useCallback((updated: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
  }, []);

  const resetCurrentProfile = useCallback(() => {
    const preset = PRESET_PROFILES[activeProfileKey] || PRESET_PROFILES.employee;
    setProfile(preset.profile);
    setTransactions(preset.transactions);
    setBudgets(preset.budgets);
    setSavingsGoals(preset.savingsGoals);
    setNotifications(preset.notifications);
  }, [activeProfileKey]);

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
