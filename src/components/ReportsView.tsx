import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Share2,
  ArrowLeft,
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
  Legend,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { DEFAULT_EXPENSE_CATEGORIES } from '../data/defaultData';

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#10b981',
  'Housing & Rent': '#6366f1',
  'Transportation': '#3b82f6',
  'Utilities & Bills': '#f59e0b',
  'Shopping': '#ec4899',
  'Education': '#8b5cf6',
  'Entertainment': '#06b6d4',
  'Healthcare & Medical': '#ef4444',
  'Personal Care': '#14b8a6',
  'Travel': '#f97316',
  'Other': '#64748b',
};

interface ReportsViewProps {
  onBackToDashboard?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToDashboard }) => {
  const {
    profile,
    transactions,
    budgets,
    savingsGoals,
    selectedMonth,
    setSelectedMonth,
    formatCurrency,
    exportCSV,
    exportJSON,
    summary,
  } = useFinance();

  const [reportPeriod, setReportPeriod] = useState<'month' | 'ytd'>('month');

  // Filter transactions by period
  const reportTransactions = useMemo(() => {
    if (reportPeriod === 'month') {
      return transactions.filter((t) => t.date.startsWith(selectedMonth));
    }
    const currentYear = selectedMonth.split('-')[0];
    return transactions.filter((t) => t.date.startsWith(currentYear));
  }, [transactions, selectedMonth, reportPeriod]);

  // Report calculations
  const totalIncome = useMemo(() => {
    return reportTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [reportTransactions]);

  const totalExpense = useMemo(() => {
    return reportTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [reportTransactions]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {};
    DEFAULT_EXPENSE_CATEGORIES.forEach((c) => {
      counts[c] = { total: 0, count: 0 };
    });

    reportTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (!counts[t.category]) counts[t.category] = { total: 0, count: 0 };
        counts[t.category].total += t.amount;
        counts[t.category].count += 1;
      });

    return Object.entries(counts)
      .map(([category, data]) => {
        const budget = budgets.find((b) => b.category === category)?.limitAmount || 0;
        const percentage = totalExpense > 0 ? Math.round((data.total / totalExpense) * 100) : 0;
        const variance = budget > 0 ? budget - data.total : 0;
        return {
          category,
          spent: data.total,
          count: data.count,
          percentage,
          budget,
          variance,
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [reportTransactions, totalExpense, budgets]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="finora-reports-view">
      {onBackToDashboard && (
        <button onClick={onBackToDashboard} className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
        </button>
      )}
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Financial Intelligence
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400">Monthly Statements & Analytics</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Financial Reports & Summaries
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Export structured audits, analyze spending habits, and evaluate cash flows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            onClick={() => exportCSV('all')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Download CSV Ledger"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Statement Card Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">FINORA Financial Statement</span>
            <h2 className="text-xl font-black text-white mt-0.5">{profile.name} — Statement</h2>
            <p className="text-xs text-slate-400">Account Role: {profile.role} • Reporting Period: {selectedMonth}</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-semibold">Net Cash Flow:</span>
            <span className={`text-xl font-black ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(netSavings)}
            </span>
          </div>
        </div>

        {/* 4 Metrics in Statement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Revenue / Inflow</span>
            <p className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(totalIncome)}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Expense / Outflow</span>
            <p className="text-xl font-black text-rose-400 mt-1">{formatCurrency(totalExpense)}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Savings Efficiency</span>
            <p className="text-xl font-black text-teal-400 mt-1">{savingsRate}% Saved</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Audited Transactions</span>
            <p className="text-xl font-black text-white mt-1">{reportTransactions.length} items</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown Data Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden" id="report-table-card">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            Category Spending Audit & Variance
          </h3>
          <span className="text-xs text-slate-400">Total Spent: {formatCurrency(totalExpense)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Transactions</th>
                <th className="px-6 py-3">Actual Spent</th>
                <th className="px-6 py-3">Spending Share</th>
                <th className="px-6 py-3">Planned Budget</th>
                <th className="px-6 py-3 text-right">Variance / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {categoryBreakdown.map((row) => (
                <tr key={row.category} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-white flex items-center space-x-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[row.category] || '#64748b' }}
                    />
                    <span>{row.category}</span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-400">{row.count} entries</td>
                  <td className="px-6 py-3.5 font-bold text-slate-100">{formatCurrency(row.spent)}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{row.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-300">
                    {row.budget > 0 ? formatCurrency(row.budget) : '—'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold">
                    {row.budget > 0 ? (
                      row.variance >= 0 ? (
                        <span className="text-teal-400">+{formatCurrency(row.variance)} under</span>
                      ) : (
                        <span className="text-rose-400">-{formatCurrency(Math.abs(row.variance))} over</span>
                      )
                    ) : (
                      <span className="text-slate-500">No Limit</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
