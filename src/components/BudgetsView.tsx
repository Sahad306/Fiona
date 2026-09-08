import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  ShieldCheck,
  Zap,
  Sliders,
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { DEFAULT_EXPENSE_CATEGORIES } from '../data/defaultData';
import { Budget, ExpenseCategory } from '../types';

interface BudgetsViewProps {
  onBackToDashboard?: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ onBackToDashboard }) => {
  const {
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    transactions,
    selectedMonth,
    setSelectedMonth,
    formatCurrency,
    profile,
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState<string>(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [limitAmount, setLimitAmount] = useState<string>('8000');
  const [alertThreshold, setAlertThreshold] = useState<number>(80);

  // --- Budget Planner (all categories at once) ---
  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerAmounts, setPlannerAmounts] = useState<Record<string, string>>({});
  const [plannerThreshold, setPlannerThreshold] = useState<number>(80);
  const [aiSuggested, setAiSuggested] = useState(false);

  // Initialize planner from existing budgets
  const initPlanner = () => {
    const amounts: Record<string, string> = {};
    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      const existing = budgets.find((b) => b.category === cat);
      amounts[cat] = existing ? existing.limitAmount.toString() : '';
    });
    setPlannerAmounts(amounts);
    setAiSuggested(false);
  };

  const togglePlanner = () => {
    if (!showPlanner) initPlanner();
    setShowPlanner(!showPlanner);
  };

  // AI Suggest: analyze last 3 months spending, suggest budget = avg * 1.15
  const handleAISuggest = () => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const expenses = transactions.filter((tx) => tx.type === 'expense');
    const suggestions: Record<string, string> = {};

    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      const catExpenses = expenses.filter((tx) => tx.category === cat && months.some((m) => tx.date.startsWith(m)));
      const totalSpent = catExpenses.reduce((s, tx) => s + tx.amount, 0);
      const monthsWithData = months.filter((m) => expenses.some((tx) => tx.category === cat && tx.date.startsWith(m)));
      const avgMonthly = monthsWithData.length > 0 ? totalSpent / monthsWithData.length : 0;

      if (avgMonthly > 0) {
        // Suggest avg + 15% buffer, rounded to nearest 500
        suggestions[cat] = String(Math.round((avgMonthly * 1.15) / 500) * 500);
      } else {
        // No history: suggest based on percentage of monthly income
        const income = profile.monthlyIncomeTarget || 50000;
        const pctMap: Record<string, number> = {
          'Food & Dining': 0.20,
          'Housing & Rent': 0.30,
          'Household & Living': 0.08,
          'Utilities & Bills': 0.07,
          'Transportation': 0.08,
          'Education': 0.05,
          'Shopping': 0.06,
          'Entertainment': 0.05,
          'Healthcare & Medical': 0.04,
          'Personal Care': 0.03,
          'Travel': 0.04,
          'Other': 0.03,
        };
        const pct = pctMap[cat] || 0.05;
        suggestions[cat] = String(Math.round((income * pct) / 500) * 500);
      }
    });

    setPlannerAmounts(suggestions);
    setAiSuggested(true);
  };

  // Save all planner budgets at once
  const handleSaveAll = () => {
    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      const amount = parseFloat(plannerAmounts[cat] || '0');
      if (isNaN(amount) || amount <= 0) return;

      const existing = budgets.find((b) => b.category === cat);
      if (existing) {
        updateBudget(existing.id, { category: cat as ExpenseCategory, limitAmount: amount, alertThreshold: plannerThreshold });
      } else {
        addBudget({ category: cat as ExpenseCategory, limitAmount: amount, period: 'monthly', alertThreshold: plannerThreshold });
      }
    });

    // Also save Overall budget (sum of all categories)
    const totalLimit = DEFAULT_EXPENSE_CATEGORIES.reduce((s, cat) => s + (parseFloat(plannerAmounts[cat] || '0') || 0), 0);
    if (totalLimit > 0) {
      const existingOverall = budgets.find((b) => b.category === 'Overall');
      if (existingOverall) {
        updateBudget(existingOverall.id, { category: 'Overall', limitAmount: totalLimit, alertThreshold: plannerThreshold });
      } else {
        addBudget({ category: 'Overall', limitAmount: totalLimit, period: 'monthly', alertThreshold: plannerThreshold });
      }
    }

    setShowPlanner(false);
  };

  // Calculate actual spending per budget for selected month
  const budgetComparisons = useMemo(() => {
    const expenses = transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(selectedMonth));

    return budgets.map((b) => {
      let spent = 0;
      if (b.category === 'Overall') {
        spent = expenses.reduce((sum, tx) => sum + tx.amount, 0);
      } else {
        spent = expenses
          .filter((tx) => tx.category === b.category)
          .reduce((sum, tx) => sum + tx.amount, 0);
      }

      const remaining = b.limitAmount - spent;
      const ratio = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
      const daysLeftInMonth = Math.max(1, 30 - new Date().getDate());
      const dailyRemainingAllowance = remaining > 0 ? remaining / daysLeftInMonth : 0;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (ratio >= 100) status = 'exceeded';
      else if (ratio >= (b.alertThreshold || 80)) status = 'warning';

      return {
        ...b,
        spent,
        remaining,
        ratio,
        dailyRemainingAllowance,
        status,
      };
    });
  }, [budgets, transactions, selectedMonth]);

  const overallBudget = budgetComparisons.find((b) => b.category === 'Overall');
  const categoryBudgets = budgetComparisons.filter((b) => b.category !== 'Overall');

  // Chart data: Budget vs Actual
  const chartData = categoryBudgets.map((b) => ({
    name: b.category,
    Budget: b.limitAmount,
    Spent: b.spent,
  }));

  const handleOpenModal = (b?: Budget) => {
    if (b) {
      setEditingBudget(b);
      setCategory(b.category);
      setLimitAmount(b.limitAmount.toString());
      setAlertThreshold(b.alertThreshold || 80);
    } else {
      setEditingBudget(null);
      // Select first category not yet budgeted, or default
      const existingCats = budgets.map((x) => x.category);
      const available = DEFAULT_EXPENSE_CATEGORIES.find((c) => !existingCats.includes(c)) || DEFAULT_EXPENSE_CATEGORIES[0];
      setCategory(available);
      setLimitAmount('500');
      setAlertThreshold(80);
    }
    setIsModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(limitAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (editingBudget) {
      updateBudget(editingBudget.id, {
        category: category as ExpenseCategory | 'Overall',
        limitAmount: amount,
        alertThreshold,
      });
    } else {
      addBudget({
        category: category as ExpenseCategory | 'Overall',
        limitAmount: amount,
        period: 'monthly',
        alertThreshold,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="finora-budgets-view">
      {onBackToDashboard && (
        <button onClick={onBackToDashboard} className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
        </button>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Budget Planning
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400">Monthly Caps & Category Thresholds</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Budget vs Actual Spending
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare planned budget limits with real-time expenses to stay within your targets.
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
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
            id="budgets-view-add-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Budget</span>
          </button>
        </div>
      </div>

      {/* Overall Monthly Budget Master Card */}
      {overallBudget && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Master Monthly Budget
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    overallBudget.status === 'exceeded'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : overallBudget.status === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {overallBudget.status === 'exceeded'
                    ? 'Over Budget'
                    : overallBudget.status === 'warning'
                    ? 'Approaching Limit'
                    : 'On Track'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline space-x-3">
                <span className="text-3xl font-black text-white">
                  {formatCurrency(overallBudget.spent)}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  of {formatCurrency(overallBudget.limitAmount)} budgeted
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Remaining Safe Balance</span>
              <p
                className={`text-xl font-black ${
                  overallBudget.remaining >= 0 ? 'text-teal-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(overallBudget.remaining)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Safe pace: ~{formatCurrency(overallBudget.dailyRemainingAllowance)}/day remaining
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden mt-4 p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallBudget.ratio >= 100
                  ? 'bg-rose-500'
                  : overallBudget.ratio >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallBudget.ratio)}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>0%</span>
            <span className="font-bold text-white">{Math.round(overallBudget.ratio)}% Consumed</span>
            <span>100% Target Limit</span>
          </div>
        </div>
      )}

      {/* Visual Chart: Category Budget vs Actual Bar Chart */}
      {chartData.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Category Spending vs Planned Budgets
              </h3>
              <p className="text-[11px] text-slate-400">Real-time category spending comparisons</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-sm bg-slate-600"></div>
                <span className="text-slate-300">Planned Budget</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                <span className="text-slate-300">Actual Spent</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-20} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: number | undefined) => [formatCurrency(val || 0), '']}
                />
                <Bar dataKey="Budget" name="Planned Limit" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" name="Actual Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="category-budgets-grid">
        {categoryBudgets.map((b) => (
          <div
            key={b.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{b.category}</h4>
                  <span className="text-[11px] text-slate-400">Monthly Budget</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === 'exceeded'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : b.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {b.status === 'exceeded'
                      ? 'Exceeded'
                      : b.status === 'warning'
                      ? `${Math.round(b.ratio)}% Used`
                      : 'Safe'}
                  </span>
                  <button
                    onClick={() => handleOpenModal(b)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer ml-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Numbers */}
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-lg font-black text-white">
                    {formatCurrency(b.spent)}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">
                    / {formatCurrency(b.limitAmount)}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-bold ${
                      b.remaining >= 0 ? 'text-teal-400' : 'text-rose-400 font-black'
                    }`}
                  >
                    {b.remaining >= 0
                      ? `${formatCurrency(b.remaining)} left`
                      : `${formatCurrency(Math.abs(b.remaining))} over`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden mt-3 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    b.ratio >= 100
                      ? 'bg-rose-500'
                      : b.ratio >= (b.alertThreshold || 80)
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, b.ratio)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Alert threshold: {b.alertThreshold}%</span>
              <span>
                {b.remaining > 0
                  ? `~${formatCurrency(b.dailyRemainingAllowance)}/day safe pace`
                  : 'Budget exhausted'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100">
            <h3 className="text-base font-bold text-white mb-1">
              {editingBudget ? 'Edit Budget Plan' : 'Create Category Budget'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set spending limits and alert notifications for this category.
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Budget Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Overall">Overall Total Budget</option>
                  {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Limit Amount (৳)
                </label>
                <input
                  type="number"
                  step="500"
                  min="100"
                  required
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Warning Alert Threshold ({alertThreshold}%)
                  </label>
                  <span className="text-[11px] text-amber-400 font-semibold">
                    Alerts when {alertThreshold}% spent
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 cursor-pointer"
                >
                  Save Budget Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
