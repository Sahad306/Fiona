import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  PiggyBank,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  Heart,
  Store,
  Compass,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { SavingsGoal } from '../types';

interface SavingsGoalsViewProps {
  initialDepositGoalId?: string | null;
  onClearInitialDepositGoal?: () => void;
  onBackToDashboard?: () => void;
}

const GOAL_ICONS: Record<string, any> = {
  ShieldCheck: Shield,
  Plane: Plane,
  Laptop: Laptop,
  Car: Car,
  Home: Home,
  GraduationCap: GraduationCap,
  Heart: Heart,
  Store: Store,
  Compass: Compass,
  FileText: FileText,
  Target: Target,
};

const COLOR_PRESETS = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#ef4444', // red
];

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  initialDepositGoalId = null,
  onClearInitialDepositGoal,
  onBackToDashboard,
}) => {
  const {
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contributeToGoal,
    withdrawFromGoal,
    formatCurrency,
    profile,
  } = useFinance();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Form states for create
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('50000');
  const [currentAmount, setCurrentAmount] = useState('15000');
  const [targetDate, setTargetDate] = useState('2025-12-31');
  const [category, setCategory] = useState('Safety Net');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [selectedIcon, setSelectedIcon] = useState('Target');
  const [monthlyContribution, setMonthlyContribution] = useState('5000');

  // Form states for deposit/withdraw
  const [transactionAmount, setTransactionAmount] = useState('1000');
  const [transactionNote, setTransactionNote] = useState('');

  // Handle initial deposit trigger from Dashboard
  React.useEffect(() => {
    if (initialDepositGoalId) {
      const found = savingsGoals.find((g) => g.id === initialDepositGoalId);
      if (found) {
        setSelectedGoal(found);
        setIsDepositModalOpen(true);
      }
      if (onClearInitialDepositGoal) onClearInitialDepositGoal();
    }
  }, [initialDepositGoalId, savingsGoals, onClearInitialDepositGoal]);

  // Summary stats
  const totalTarget = useMemo(() => {
    return savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  }, [savingsGoals]);

  const totalSaved = useMemo(() => {
    return savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  }, [savingsGoals]);

  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const completedGoalsCount = savingsGoals.filter((g) => g.currentAmount >= g.targetAmount).length;

  const handleOpenCreateModal = (goal?: SavingsGoal) => {
    if (goal) {
      setSelectedGoal(goal);
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      setCurrentAmount(goal.currentAmount.toString());
      setTargetDate(goal.targetDate);
      setCategory(goal.category);
      setSelectedColor(goal.color || '#10b981');
      setSelectedIcon(goal.icon || 'Target');
      setMonthlyContribution((goal.monthlyContribution || 150).toString());
    } else {
      setSelectedGoal(null);
      setName('');
      setTargetAmount('2500');
      setCurrentAmount('400');
      setTargetDate('2025-12-31');
      setCategory('Personal');
      setSelectedColor('#10b981');
      setSelectedIcon('Target');
      setMonthlyContribution('250');
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    if (isNaN(target) || target <= 0 || !name.trim()) return;

    if (selectedGoal) {
      updateSavingsGoal(selectedGoal.id, {
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
        category,
        color: selectedColor,
        icon: selectedIcon,
        monthlyContribution: monthly,
      });
    } else {
      addSavingsGoal({
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
        category,
        color: selectedColor,
        icon: selectedIcon,
        monthlyContribution: monthly,
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) return;

    contributeToGoal(selectedGoal.id, amount, transactionNote.trim());
    setIsDepositModalOpen(false);
    setTransactionAmount('100');
    setTransactionNote('');
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) return;

    withdrawFromGoal(selectedGoal.id, amount);
    setIsWithdrawModalOpen(false);
    setTransactionAmount('100');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="finora-savings-goals-view">
      {onBackToDashboard && (
        <button onClick={onBackToDashboard} className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-emerald-400 transition-colors cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
        </button>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/60 p-5 rounded-2xl border border-line backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Savings Vault
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span className="text-xs text-ink-3">Milestones, Auto-Track & Confetti Goals</span>
          </div>
          <h1 className="text-2xl font-black text-ink tracking-tight mt-0.5">
            Savings Goal Tracking
          </h1>
          <p className="text-xs text-ink-3 mt-1">
            Set financial milestones, track completion pace, and celebrate progress.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          id="savings-view-add-goal-btn"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Total Saved</span>
          <p className="text-2xl font-black text-teal-400 tracking-tight mt-2">
            {formatCurrency(totalSaved)}
          </p>
          <p className="text-[11px] text-ink-3 mt-1">Across {savingsGoals.length} active goals</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Total Target Amount</span>
          <p className="text-2xl font-black text-ink tracking-tight mt-2">
            {formatCurrency(totalTarget)}
          </p>
          <p className="text-[11px] text-ink-3 mt-1">Combined target portfolio</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Overall Progress</span>
          <p className="text-2xl font-black text-emerald-400 tracking-tight mt-2">
            {overallProgress}%
          </p>
          <div className="w-full bg-elevated h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Completed Goals</span>
          <p className="text-2xl font-black text-amber-400 tracking-tight mt-2 flex items-center gap-1.5">
            <Award className="w-6 h-6 text-amber-400" />
            {completedGoalsCount} / {savingsGoals.length}
          </p>
          <p className="text-[11px] text-ink-3 mt-1">Achieved milestones</p>
        </div>
      </div>

      {/* Savings Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="savings-goals-grid">
        {savingsGoals.map((goal) => {
          const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const isCompleted = goal.currentAmount >= goal.targetAmount;
          const IconComponent = GOAL_ICONS[goal.icon] || Target;

          // Calculate estimated months left based on monthlyContribution
          const monthlyRate = goal.monthlyContribution || 150;
          const monthsLeft = remaining > 0 && monthlyRate > 0 ? Math.ceil(remaining / monthlyRate) : 0;

          return (
            <div
              key={goal.id}
              className={`p-5 rounded-2xl bg-surface border transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group ${
                isCompleted
                  ? 'border-emerald-500/50 shadow-emerald-500/10'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              {isCompleted && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 px-3 py-0.5 rounded-bl-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Goal Achieved!
                </div>
              )}

              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-ink shrink-0 shadow-md"
                      style={{ backgroundColor: goal.color || '#10b981' }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink truncate max-w-[150px]">{goal.name}</h3>
                      <span className="text-[10px] font-semibold text-ink-3">{goal.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenCreateModal(goal)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
                      title="Edit Goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSavingsGoal(goal.id)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-rose-400 hover:bg-elevated transition-colors cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-2xl font-black text-ink tracking-tight">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-xs font-bold text-ink-3">
                      of {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>

                  <div className="w-full bg-canvas h-3 rounded-full overflow-hidden p-0.5 border border-line">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: goal.color || '#10b981',
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-400">{percent}% Funded</span>
                    <span className="text-ink-3">
                      {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Funded'}
                    </span>
                  </div>
                </div>

                {/* Milestones indicator */}
                <div className="mt-3 pt-3 border-t border-line/80 flex items-center justify-between text-[11px] text-ink-3">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-ink-4" />
                    <span>Target: {goal.targetDate}</span>
                  </div>
                  {monthsLeft > 0 && (
                    <span className="text-emerald-400 font-semibold">
                      ~{monthsLeft} mos remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedGoal(goal);
                    setIsDepositModalOpen(true);
                  }}
                  className="flex-1 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500 hover:text-slate-950 text-teal-400 border border-teal-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Deposit Funds</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedGoal(goal);
                    setIsWithdrawModalOpen(true);
                  }}
                  className="py-2 px-3 rounded-xl bg-elevated hover:bg-line-strong text-ink-2 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
                  title="Withdraw Funds"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Goal Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-line shadow-2xl p-6 text-ink max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-ink mb-1">
              {selectedGoal ? 'Edit Savings Goal' : 'Create New Savings Goal'}
            </h3>
            <p className="text-xs text-ink-3 mb-4">
              Define your financial target, deadline, and color theme.
            </p>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Goal Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Fund (6 Months) or Tokyo Trip"
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs text-ink focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Target Amount ({profile.currencySymbol}) *</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-bold text-ink focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Current Saved ({profile.currencySymbol})</label>
                  <input
                    type="number"
                    step="10"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-bold text-ink focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-canvas border border-line rounded-xl text-xs text-ink focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-canvas border border-line rounded-xl text-xs text-ink focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Safety Net">Safety Net / Emergency</option>
                    <option value="Travel">Travel & Vacations</option>
                    <option value="Electronics">Tech & Electronics</option>
                    <option value="Vehicle">Car / Vehicle</option>
                    <option value="Housing">Real Estate / Housing</option>
                    <option value="Education">Education & Courses</option>
                    <option value="Expansion">Business Expansion</option>
                    <option value="Personal">Personal / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  Monthly Contribution Target ({profile.currencySymbol})
                </label>
                <input
                  type="number"
                  step="25"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  placeholder="200"
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs text-ink focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Color Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1.5">Theme Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        selectedColor === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-elevated hover:bg-line-strong text-ink-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 cursor-pointer"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {isDepositModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-line shadow-2xl p-6 text-ink">
            <h3 className="text-base font-bold text-ink mb-1 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-teal-400" />
              Deposit to "{selectedGoal.name}"
            </h3>
            <p className="text-xs text-ink-3 mb-4">
              Current progress: {formatCurrency(selectedGoal.currentAmount)} / {formatCurrency(selectedGoal.targetAmount)}
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Deposit Amount ({profile.currencySymbol}) *</label>
                <input
                  type="number"
                  step="10"
                  required
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full px-3.5 py-3 bg-canvas border border-line rounded-xl text-lg font-bold text-teal-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Deposit Note (Optional)</label>
                <input
                  type="text"
                  value={transactionNote}
                  onChange={(e) => setTransactionNote(e.target.value)}
                  placeholder="e.g. Side hustle bonus, monthly savings"
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs text-ink focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-elevated hover:bg-line-strong text-ink-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 cursor-pointer"
                >
                  Confirm Deposit 
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-line shadow-2xl p-6 text-ink">
            <h3 className="text-base font-bold text-ink mb-1">
              Withdraw Funds from "{selectedGoal.name}"
            </h3>
            <p className="text-xs text-ink-3 mb-4">
              Current balance: {formatCurrency(selectedGoal.currentAmount)}
            </p>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Withdrawal Amount ({profile.currencySymbol}) *</label>
                <input
                  type="number"
                  step="10"
                  required
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full px-3.5 py-3 bg-canvas border border-line rounded-xl text-lg font-bold text-rose-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-elevated hover:bg-line-strong text-ink-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 cursor-pointer"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
