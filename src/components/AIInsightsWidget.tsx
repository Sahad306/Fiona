import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Target, Lightbulb, RefreshCw, Loader2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface Insight {
  type: 'trend' | 'alert' | 'goal' | 'tip';
  icon: React.ElementType;
  color: string;
  text: string;
}

export const AIInsightsWidget: React.FC = () => {
  const { summary, transactions, budgets, savingsGoals, selectedMonth, authToken } = useFinance();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  const generateLocalInsights = (): Insight[] => {
    const result: Insight[] = [];

    // Budget alerts
    const overBudget = budgets
      .filter((b) => b.category !== 'Overall')
      .map((b) => {
        const spent = transactions
          .filter((t) => t.type === 'expense' && t.category === b.category && t.date.startsWith(selectedMonth))
          .reduce((sum, t) => sum + t.amount, 0);
        return { ...b, spent, ratio: (spent / b.limitAmount) * 100 };
      })
      .filter((b) => b.ratio >= 80);

    if (overBudget.length > 0) {
      result.push({
        type: 'alert',
        icon: AlertTriangle,
        color: 'text-rose-400',
        text: `${overBudget.length} budget${overBudget.length > 1 ? 's' : ''} near or over limit: ${overBudget.map((b) => `${b.category} (${Math.round(b.ratio)}%)`).join(', ')}`,
      });
    }

    // Savings rate insight
    if (summary.savingsRate < 20 && summary.totalIncome > 0) {
      result.push({
        type: 'tip',
        icon: Lightbulb,
        color: 'text-amber-400',
        text: `Savings rate is ${summary.savingsRate}% — below the recommended 20%. Try reducing your top expense category by even 10% to close the gap.`,
      });
    } else if (summary.savingsRate >= 30) {
      result.push({
        type: 'trend',
        icon: TrendingUp,
        color: 'text-emerald-400',
        text: `Excellent savings rate of ${summary.savingsRate}%! You're well above the 20% benchmark.`,
      });
    }

    // Goal progress
    savingsGoals.forEach((goal) => {
      const pct = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
      if (pct >= 75 && pct < 100) {
        result.push({
          type: 'goal',
          icon: Target,
          color: 'text-teal-400',
          text: `"${goal.name}" is ${pct}% complete — almost there! Consider increasing monthly contributions to hit it sooner.`,
        });
      }
    });

    // Top expense category
    if (summary.topExpenseCategories.length > 0) {
      const top = summary.topExpenseCategories[0];
      if (top.percentage > 35) {
        result.push({
          type: 'alert',
          icon: AlertTriangle,
          color: 'text-orange-400',
          text: `${top.category} accounts for ${top.percentage}% of all expenses — consider reviewing recurring costs in this category.`,
        });
      }
    }

    // Positive cash flow
    if (summary.remainingBalance > 0 && summary.savingsRate >= 20) {
      result.push({
        type: 'trend',
        icon: TrendingUp,
        color: 'text-emerald-400',
        text: `Positive cash flow with ${summary.savingsRate}% savings rate. Your financial health is strong this month.`,
      });
    }

    return result.slice(0, 4);
  };

  useEffect(() => {
    setInsights(generateLocalInsights());
  }, [transactions, budgets, savingsGoals, selectedMonth, summary]);

  if (insights.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/20 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Insights</h3>
        </div>
        <span className="text-[10px] font-semibold text-emerald-400/70 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          Live
        </span>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 transition-colors"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${insight.color}`} />
              <p className="text-xs text-slate-300 leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIInsightsWidget;
