import React, { useState, useMemo } from 'react';
import { MonthPicker } from './MonthPicker';
import {
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Search,
  Download,
  Calendar,
  Wallet,
  TrendingUp,
  Tag,
  CreditCard,
  Trash2,
  Edit2,
  PieChart as PieIcon,
  Briefcase,
  Laptop,
  Building2,
  GraduationCap,
  Zap,
  Home,
  Gift,
  CheckCircle2,
  UserCheck,
  BarChart3,
  Target,
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
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { DEFAULT_INCOME_SOURCES } from '../data/defaultData';
import { Transaction } from '../types';

interface IncomeViewProps {
  onOpenTransactionModal: (type?: 'income' | 'expense') => void;
  onEditTransaction: (tx: Transaction) => void;
  onBackToDashboard?: () => void;
}

const COLORS = [
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#3b82f6',
  '#f97316',
];

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  Salary: <Briefcase className="w-4 h-4 text-emerald-400" />,
  Freelancing: <Laptop className="w-4 h-4 text-teal-400" />,
  Business: <Building2 className="w-4 h-4 text-blue-400" />,
  Investments: <TrendingUp className="w-4 h-4 text-indigo-400" />,
  Allowances: <Gift className="w-4 h-4 text-pink-400" />,
  'Rental Income': <Home className="w-4 h-4 text-amber-400" />,
  'Side Hustle': <Zap className="w-4 h-4 text-amber-700 dark:text-amber-300" />,
  Gifts: <Gift className="w-4 h-4 text-purple-400" />,
  Other: <Wallet className="w-4 h-4 text-ink-3" />,
};

// 1-Click Fast Inflow Presets in Bangladeshi Taka (Tk)
const INCOME_QUICK_PRESETS = [
  { label: ' Tech Salary', amount: 65000, source: 'Salary', desc: 'Monthly Salary Paycheck', payer: 'Primary Employer' },
  { label: ' Freelance Milestone', amount: 18000, source: 'Freelancing', desc: 'Web Dev & Cloud Delivery', payer: 'Client Milestone' },
  { label: ' Tuition & Mentoring', amount: 8000, source: 'Side Hustle', desc: 'Student Tutoring / Mentoring', payer: 'Student Parent' },
  { label: ' Family Allowance', amount: 12000, source: 'Allowances', desc: 'Family Support & Study Grant', payer: 'Family / Support' },
  { label: ' DPS & Investment', amount: 5000, source: 'Investments', desc: 'DPS / Savings Certificate Yield', payer: 'Bank / Post Office' },
];

export const IncomeView: React.FC<IncomeViewProps> = ({
  onOpenTransactionModal,
  onEditTransaction,
  onBackToDashboard,
}) => {
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    selectedMonth,
    setSelectedMonth,
    formatCurrency,
    exportCSV,
    profile,
  } = useFinance();// provides all finance state and utility functions

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // keeps only income transactions
  const incomeTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.type === 'income' && !tx.savingsTransfer);
  }, [transactions]);

  // Monthly income list
  const monthlyIncomes = useMemo(() => {
    return incomeTransactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [incomeTransactions, selectedMonth]);

  // Filtered and sorted
  const displayIncomes = useMemo(() => {
    return incomeTransactions
      .filter((tx) => {
        const matchesMonth = selectedMonth ? tx.date.startsWith(selectedMonth) : true;
        const matchesSearch =
          tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (tx.payerOrClient && tx.payerOrClient.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (tx.tags && tx.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesSource = selectedSource === 'all' || tx.category === selectedSource;
        return matchesMonth && matchesSearch && matchesSource;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        return 0;
      });
  }, [incomeTransactions, selectedMonth, searchQuery, selectedSource, sortBy]);

  // Stats calculation
  const totalMonthlyIncome = useMemo(() => {
    return monthlyIncomes.reduce((sum, tx) => sum + tx.amount, 0);
  }, [monthlyIncomes]);

  const targetMonthlyIncome = profile.monthlyIncomeTarget || 5000;
  const incomePacingPercent = Math.min((totalMonthlyIncome / targetMonthlyIncome) * 100, 100);

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {};
    monthlyIncomes.forEach((tx) => {
      if (!counts[tx.category]) {
        counts[tx.category] = { total: 0, count: 0 };
      }
      counts[tx.category].total += tx.amount;
      counts[tx.category].count += 1;
    });

    return Object.entries(counts)
      .map(([name, data], idx) => ({
        name,
        value: data.total,
        count: data.count,
        percentage: totalMonthlyIncome > 0 ? (data.total / totalMonthlyIncome) * 100 : 0,
        color: COLORS[idx % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyIncomes, totalMonthlyIncome]);

  const topSource = sourceBreakdown[0] || { name: 'Salary', value: 0, percentage: 0 };
  const avgIncomePerEntry = monthlyIncomes.length > 0 ? totalMonthlyIncome / monthlyIncomes.length : 0;

  // Recurring vs Variable Inflow
  const recurringIncomeTotal = useMemo(() => {
    return monthlyIncomes
      .filter((tx) => tx.recurring && tx.recurring !== 'none')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [monthlyIncomes]);

  // creates a new transaction immediately
  const handleQuickAdd = (preset: (typeof INCOME_QUICK_PRESETS)[0]) => {
    addTransaction({
      type: 'income',
      amount: preset.amount,
      category: preset.source,
      description: preset.desc,
      payerOrClient: preset.payer,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      recurring: preset.source === 'Salary' ? 'monthly' : 'none',
      tags: ['QuickInflow', preset.source],
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="finora-income-view">
      {/* Back to Dashboard */}
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Dashboard
        </button>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/60 p-5 rounded-2xl border border-line backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Inflow Capital Engine
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-ink-3">Salary, Freelance, Business, Stipends & Dividends</span>
          </div>
          <h1 className="text-2xl font-black text-ink tracking-tight mt-0.5">
            Income Streams & Inflows
          </h1>
          <p className="text-xs text-ink-3 mt-1">
            Capture, categorize, and forecast all revenue streams, client contracts, and academic stipends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />

          <button
            onClick={() => exportCSV('income')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-line-strong text-ink border border-line-strong text-xs font-semibold transition-all cursor-pointer"
            title="Download Income CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => onOpenTransactionModal('income')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs font-extrabold shadow-md shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
            id="income-view-add-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Income Inflow</span>
          </button>
        </div>
      </div>

      {/* Quick 1-Click Inflow Presets Toolbar */}
      <div className="bg-surface/80 p-4 rounded-2xl border border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-ink">Instant Inflow 1-Click Fast-Log</h3>
              <p className="text-[10px] text-ink-3">
                Instantly deposit standard paychecks, client milestones, and student scholarships.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 self-start sm:self-auto">
            Target: {formatCurrency(targetMonthlyIncome)}/mo
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {INCOME_QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleQuickAdd(preset)}
              className="p-2.5 rounded-xl bg-canvas hover:bg-elevated/80 border border-line hover:border-line-strong text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink group-hover:text-ink truncate">
                  {preset.label}
                </span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  +{formatCurrency(preset.amount)}
                </span>
              </div>
              <span className="text-[10px] text-ink-4 block truncate mt-0.5">
                {preset.payer}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Total Monthly Inflow</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 tracking-tight mt-2 font-mono">
            {formatCurrency(totalMonthlyIncome)}
          </p>
          <div className="mt-2 space-y-1">
            <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${incomePacingPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-3">
              <span>Goal: {formatCurrency(targetMonthlyIncome)}</span>
              <span className="text-emerald-400 font-bold">{incomePacingPercent.toFixed(0)}% reached</span>
            </div>
          </div>
        </div>

        {/* Primary Source */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Top Income Stream</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-ink tracking-tight mt-2 truncate">
            {topSource.name}
          </p>
          <p className="text-[11px] text-ink-3 mt-1">
            <strong className="text-emerald-400 font-mono">{formatCurrency(topSource.value)}</strong> ({topSource.percentage.toFixed(0)}% of earnings)
          </p>
        </div>

        {/* Recurring Inflow */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Recurring Inflow</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-ink tracking-tight mt-2 font-mono">
            {formatCurrency(recurringIncomeTotal)}
          </p>
          <p className="text-[11px] text-ink-3 mt-1">
            {totalMonthlyIncome > 0
              ? `${((recurringIncomeTotal / totalMonthlyIncome) * 100).toFixed(0)}% of income is guaranteed recurring`
              : 'Fixed monthly inflow'}
          </p>
        </div>

        {/* Total Entries & Average */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Deposits Logged</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-ink tracking-tight mt-2">
            {monthlyIncomes.length} <span className="text-xs font-normal text-ink-3">deposits</span>
          </p>
          <p className="text-[11px] text-ink-3 mt-1">
            Avg <strong className="text-emerald-400 font-mono">{formatCurrency(avgIncomePerEntry)}</strong> per entry
          </p>
        </div>
      </div>

      {/* Visual Charts */} 
      {sourceBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 mb-3">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Inflow Share by Stream
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-line-strong)', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number | undefined) => [formatCurrency(val || 0), 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 p-5 rounded-2xl bg-surface border border-line shadow-sm">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Income Stream Volume Comparison
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 55, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line-strong)" opacity={0.4} />
                  <XAxis type="number" stroke="var(--c-ink-3)" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="var(--c-ink-3)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-line-strong)', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number | undefined) => [formatCurrency(val || 0), 'Total Inflow']}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search income description, payer, tags..."
            className="w-full pl-9 pr-4 py-2 bg-canvas border border-line rounded-xl text-xs text-ink focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Source filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none cursor-pointer"
          >
            <option value="all">All Income Streams</option>
            {DEFAULT_INCOME_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none cursor-pointer"
          >
            <option value="date_desc">Newest Date First</option>
            <option value="date_asc">Oldest Date First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Income Records List */}
      <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden" id="income-table-card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <span>Income Transactions</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-elevated text-ink-3 font-normal">
              {displayIncomes.length} records
            </span>
          </h3>
          <span className="text-xs text-emerald-400 font-bold font-mono">
            Total: +{formatCurrency(displayIncomes.reduce((s, t) => s + t.amount, 0))}
          </span>
        </div>

        {displayIncomes.length === 0 ? (
          <div className="py-16 text-center text-ink-3 text-xs">
            <Wallet className="w-10 h-10 text-ink-4 mx-auto mb-2" />
            No income transactions match your filters.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {displayIncomes.map((tx) => (
              <div
                key={tx.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-elevated/40 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    {SOURCE_ICONS[tx.category] || <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="text-xs font-bold text-ink">{tx.description}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {tx.category}
                      </span>
                      {tx.payerOrClient && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-elevated text-ink-2 border border-line-strong flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5 text-teal-400" />
                          {tx.payerOrClient}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3 mt-1">
                      <span className="font-mono">{tx.date}</span>
                      <span>•</span>
                      <span>{tx.paymentMethod}</span>
                      {tx.recurring && tx.recurring !== 'none' && (
                        <>
                          <span>•</span>
                          <span className="text-teal-400 font-medium capitalize">{tx.recurring} Recurring</span>
                        </>
                      )}
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] text-ink-3 mt-1 italic">
                        "{tx.notes}"
                      </p>
                    )}

                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tx.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-elevated text-ink-2 font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0">
                  <span className="text-base font-black text-emerald-400 tracking-tight font-mono">
                    +{formatCurrency(tx.amount)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
                      title="Edit Income"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-rose-400 hover:bg-elevated transition-colors cursor-pointer"
                      title="Delete Income"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
