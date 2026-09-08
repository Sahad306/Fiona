export type UserRole =
  | 'University Student'
  | 'Salaried Employee'
  | 'Freelancer'
  | 'Small Business Owner'
  | 'Family Household'
  | 'Individual';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  currency: string;
  currencySymbol: string;
  monthlyIncomeTarget?: number;
  monthlyExpenseBudget?: number;
  joinedDate: string;
}

export type IncomeSource =
  | 'Salary'
  | 'Freelancing'
  | 'Business'
  | 'Allowances'
  | 'Investments'
  | 'Rental Income'
  | 'Gifts'
  | 'Side Hustle'
  | 'Other';

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Housing & Rent'
  | 'Household & Living'
  | 'Utilities & Bills'
  | 'Transportation'
  | 'Education'
  | 'Shopping'
  | 'Entertainment'
  | 'Healthcare & Medical'
  | 'Personal Care'
  | 'Travel'
  | 'Other';

export type PaymentMethod =
  | 'bKash'
  | 'Nagad'
  | 'Rocket'
  | 'Bank Transfer'
  | 'Cash'
  | 'Credit Card'
  | 'Debit Card'
  | 'UPI / Online'
  | 'Other';

export interface DailyRoutineConfig {
  dailyRate: number;
  totalDaysInMonth: number;
  offDaysCount: number;
  offDaysReason?: string;
  calculatedMonthlyTotal: number;
}

export interface SectorSplit {
  sector: string;
  amount: number;
  note?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: ExpenseCategory | IncomeSource | string;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  recurring?: 'none' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  notes?: string;
  payerOrClient?: string;
  sectorSplits?: SectorSplit[];
  dailyConfig?: DailyRoutineConfig;
  expenseMode?: 'daily' | 'monthly';
  createdAt: string;
}

export interface Budget {
  id: string;
  category: ExpenseCategory | 'Overall';
  limitAmount: number;
  period: 'monthly';
  alertThreshold: number; // e.g. 80 for 80%
  month?: string; // e.g., '2025-08'
}

export interface SavingsContribution {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: string;
  color: string;
  icon: string;
  monthlyContribution?: number;
  contributions: SavingsContribution[];
  completed?: boolean;
}

export type NotificationType =
  | 'budget_limit_close'
  | 'budget_exceeded'
  | 'savings_milestone'
  | 'monthly_report_ready'
  | 'income_received'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'danger' | 'success';
  relatedCategory?: string;
  relatedGoalId?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  monthlySavings: number;
  savingsRate: number;
  topExpenseCategories: { category: string; amount: number; percentage: number }[];
  incomeSourcesBreakdown: { source: string; amount: number; percentage: number }[];
  budgetUtilization: {
    totalBudget: number;
    totalSpent: number;
    percentage: number;
    remaining: number;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  currency: string;
  currencySymbol: string;
  monthlyIncomeTarget?: number;
  monthlyExpenseBudget?: number;
  createdAt: string;
}

export interface DatabaseStatus {
  status: string;
  storage: string;
  stats?: {
    totalUsers: number;
    activeSessions: number;
    totalDatasets: number;
    lastBackup: string;
  };
  lastSyncedAt?: string;
  isOnline: boolean;
}

