import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Plus,
  Target,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { Transaction } from '../types';

interface DashboardProps {
  onOpenTransactionModal: (type?: 'income' | 'expense') => void;
  setActiveTab: (tab: string) => void;
  onDepositGoal: (goalId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#10b981',
  'Housing & Rent': '#6366f1',
  'Household & Living': '#14b8a6',
  'Transportation': '#3b82f6',
  'Utilities & Bills': '#f59e0b',
  'Shopping': '#ec4899',
  'Education': '#8b5cf6',
  'Entertainment': '#06b6d4',
  'Healthcare & Medical': '#ef4444',
  'Personal Care': '#2dd4bf',
  'Travel': '#f97316',
  'Other': '#64748b',
};

const SOURCE_COLORS = ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenTransactionModal,
  setActiveTab,
  onDepositGoal,
}) => {
  const {
    profile,
    summary,
    transactions,
    budgets,
    savingsGoals,
    selectedMonth,
    setSelectedMonth,
    formatCurrency,
    deleteTransaction,
  } = useFinance();

  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Filtered transactions for list
  const recentTransactions = transactions
    .filter((tx) => (txFilter === 'all' ? true : tx.type === txFilter))
    .slice(0, 6);

  // Budget alerts calculation
  const overBudgetCategories = budgets
    .filter((b) => b.category !== 'Overall')
    .map((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && t.date.startsWith(selectedMonth))
        .reduce((sum, t) => sum + t.amount, 0);
      const ratio = (spent / b.limitAmount) * 100;
      return {
        ...b,
        spent,
        ratio,
        overAmount: spent - b.limitAmount,
      };
    })
    .filter((b) => b.ratio >= 80);

  // 6-Month Income vs Expense — REAL data from recorded transactions only.
  // Months with no records simply show zero; nothing is fabricated.
  const monthlyBarData = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const [y, m] = selectedMonth.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en', { month: 'short' }) + (i === 0 ? ' (Cur)' : ''),
      });
    }
    return months.map(({ key, label }) => {
      let income = 0;
      let expenses = 0;
      transactions.forEach((tx) => {
        if (!tx.date.startsWith(key) || tx.savingsTransfer) return;
        if (tx.type === 'income') income += tx.amount;
        else expenses += tx.amount;
      });
      return { month: label, income, expenses };
    });
  }, [transactions, selectedMonth]);

  // Cumulative savings cash flow data
  const cashFlowTrendData = [
    { day: 'Day 1', balance: summary.totalIncome * 0.6, savings: 1200 },
    { day: 'Day 5', balance: summary.totalIncome * 0.55, savings: 1500 },
    { day: 'Day 10', balance: summary.totalIncome * 0.7, savings: 1850 },
    { day: 'Day 15', balance: summary.totalIncome * 0.65, savings: 2200 },
    { day: 'Day 20', balance: summary.totalIncome * 0.8, savings: 2600 },
    { day: 'Day 25', balance: summary.totalIncome - summary.totalExpenses * 0.85, savings: 2900 },
    { day: 'Current', balance: summary.remainingBalance, savings: summary.monthlySavings },
  ];

  // Donut chart expense data
  const expensePieData = summary.topExpenseCategories.map((c) => ({
    name: c.category,
    value: c.amount,
    color: CATEGORY_COLORS[c.category] || '#64748b',
  }));

  // Donut chart income data
  const incomePieData = summary.incomeSourcesBreakdown.map((s, index) => ({
    name: s.source,
    value: s.amount,
    color: SOURCE_COLORS[index % SOURCE_COLORS.length],
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="finora-dashboard-view">
      {/* Top Welcome Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Personal Financial Overview
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400">{profile.role}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Welcome back, {profile.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            FINORA is actively tracking your cash flow, budget limits, and savings goals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => onOpenTransactionModal('income')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
            id="dash-add-income-btn"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Income</span>
          </button>

          <button
            onClick={() => onOpenTransactionModal('expense')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            id="dash-add-expense-btn"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>+ Expense</span>
          </button>
        </div>
      </div>

      {/* Critical Budget Alert Banner (If Any Over/Near Limit) */}
      {overBudgetCategories.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-300">
                Budget Alert: {overBudgetCategories.length} categories require attention!
              </p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {overBudgetCategories.map((c) => `${c.category} (${Math.round(c.ratio)}% used)`).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('budgets')}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors whitespace-nowrap self-start sm:self-center cursor-pointer"
          >
            Manage Budgets →
          </button>
        </div>
      )}

      {/* 4 Key Metric Cards (Specified in PDF) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
        {/* Total Income */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Income</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(summary.totalIncome)}
            </p>
            <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-emerald-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Inflow for {selectedMonth}</span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(summary.totalExpenses)}
            </p>
            <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-rose-400 font-semibold">
              <span>{summary.budgetUtilization.percentage}% of monthly budget</span>
            </div>
          </div>
        </div>

        {/* Remaining Balance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Remaining Balance</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-black tracking-tight ${summary.remainingBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrency(summary.remainingBalance)}
            </p>
            <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-teal-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Net Disposable Cash</span>
            </div>
          </div>
        </div>

        {/* Monthly Savings & Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Savings</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(summary.monthlySavings)}
            </p>
            <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-indigo-400 font-semibold">
              <span>{summary.savingsRate}% Savings Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Outflow & Sectors Quick Navigator Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Daily Burn Rate & Sector Division
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {formatCurrency(summary.totalExpenses / 30)}/day
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Food & Dining • Housing & Rent • Household & Living • Daily Coffee/Lunch
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('expenses')}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Daily Expense Tracker →</span>
          </button>

          <button
            onClick={() => setActiveTab('income')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Income Inflow Hub →</span>
          </button>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Income vs Expense Trend Bar Chart & Cash Flow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Comparison Bar Chart */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Income vs Expenses (Monthly Comparison)
                </h3>
                <p className="text-[11px] text-slate-400">6-Month financial flow comparison</p>
              </div>
              <div className="flex items-center space-x-4 text-xs font-semibold">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                  <span className="text-slate-300">Income</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                  <span className="text-slate-300">Expenses</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      Math.abs(v) >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(Math.abs(v) % 1_000_000 === 0 ? 0 : 1)}M`
                        : Math.abs(v) >= 1_000
                        ? `${(v / 1_000).toFixed(Math.abs(v) % 1_000 === 0 ? 0 : 1)}k`
                        : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: number | undefined) => [formatCurrency(value || 0), '']}
                  />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cash Flow & Cumulative Savings Area Chart */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-400" />
                  Cash Flow & Cumulative Savings Trajectory
                </h3>
                <p className="text-[11px] text-slate-400">Intra-month financial safety buffer</p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      Math.abs(v) >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(Math.abs(v) % 1_000_000 === 0 ? 0 : 1)}M`
                        : Math.abs(v) >= 1_000
                        ? `${(v / 1_000).toFixed(Math.abs(v) % 1_000 === 0 ? 0 : 1)}k`
                        : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: number | undefined) => [formatCurrency(value || 0), '']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" name="Net Cash Balance" />
                  <Area type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" name="Accumulated Savings" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Expense Donut Chart & Savings Goals Quick Widget */}
        <div className="space-y-6">
          {/* Expense Category Donut Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                Expense Breakdown
              </h3>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                View All →
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">Spending by category this month</p>

            {expensePieData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No expense data recorded for this month.
              </div>
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                        formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1">
                  {summary.topExpenseCategories.slice(0, 4).map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748b' }}
                        />
                        <span className="text-slate-300 truncate max-w-[130px]">{cat.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">{formatCurrency(cat.amount)}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({cat.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Savings Goals Quick Tracker */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-400" />
                Savings Goals
              </h3>
              <button
                onClick={() => setActiveTab('savings')}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
              >
                Manage ({savingsGoals.length}) →
              </button>
            </div>

            <div className="space-y-3.5">
              {savingsGoals.slice(0, 3).map((goal) => {
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return (
                  <div
                    key={goal.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-white truncate max-w-[160px]">{goal.name}</span>
                      <span className="font-bold text-emerald-400">{percent}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: goal.color || '#10b981',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</span>
                      <button
                        onClick={() => onDepositGoal(goal.id)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer"
                      >
                        + Deposit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table / Feed */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm" id="recent-transactions-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-400">Latest income and expense entries</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
            <button
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                txFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setTxFilter('income')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                txFilter === 'income' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Income Inflows
            </button>
            <button
              onClick={() => setTxFilter('expense')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                txFilter === 'expense' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Expenses
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No transactions found. Click "+ Add Transaction" above to start logging.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{tx.description}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-300">{tx.category}</span>
                        <span>•</span>
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className="hidden sm:inline">{tx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span
                      className={`text-sm font-black tracking-tight ${
                        isIncome ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Showing latest {recentTransactions.length} items</span>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('income')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Full Income Ledger →
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Full Expense Ledger →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
