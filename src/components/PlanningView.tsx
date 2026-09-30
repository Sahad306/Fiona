import React from 'react';
import { CreditCard, Target } from 'lucide-react';
import { BudgetsView } from './BudgetsView';
import { SavingsGoalsView } from './SavingsGoalsView';

export type PlanningTab = 'budgets' | 'savings';

interface PlanningViewProps {
  tab: PlanningTab;
  onTabChange: (tab: PlanningTab) => void;
  initialDepositGoalId?: string | null;
  onClearInitialDepositGoal?: () => void;
  onBackToDashboard?: () => void;
}

/**
 * Single entry point for both planning tools. Hosts a sub-tab switcher and
 * delegates rendering to the existing BudgetsView / SavingsGoalsView, so the
 * navbar only needs one button for both features.
 */
export const PlanningView: React.FC<PlanningViewProps> = ({
  tab,
  onTabChange,
  initialDepositGoalId = null,
  onClearInitialDepositGoal,
  onBackToDashboard,
}) => {
  const tabs: { id: PlanningTab; label: string; icon: typeof CreditCard }[] = [
    { id: 'budgets', label: 'Budgets', icon: CreditCard },
    { id: 'savings', label: 'Savings Goals', icon: Target },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Budget and savings tools"
        className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800"
        id="planning-subtabs"
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'budgets' ? (
        <BudgetsView onBackToDashboard={onBackToDashboard} />
      ) : (
        <SavingsGoalsView
          initialDepositGoalId={initialDepositGoalId}
          onClearInitialDepositGoal={onClearInitialDepositGoal}
          onBackToDashboard={onBackToDashboard}
        />
      )}
    </div>
  );
};

export default PlanningView;
