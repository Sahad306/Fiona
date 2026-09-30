import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { ReportsView } from './ReportsView';
import { AIAdvisorView } from './AIAdvisorView';

export type ReportsAiTab = 'reports' | 'advisor';

interface ReportsAiViewProps {
  tab: ReportsAiTab;
  onTabChange: (tab: ReportsAiTab) => void;
  onBackToDashboard?: () => void;
}

/**
 * Single entry point for Reports and the AI Advisor. Hosts a sub-tab switcher
 * and delegates rendering to the existing views, so the navbar only needs one
 * button for both features.
 */
export const ReportsAiView: React.FC<ReportsAiViewProps> = ({
  tab,
  onTabChange,
  onBackToDashboard,
}) => {
  const tabs: { id: ReportsAiTab; label: string; icon: typeof FileText }[] = [
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'advisor', label: 'AI Advisor', icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Reports and AI advisor"
        className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 print:hidden"
        id="reports-ai-subtabs"
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

      {tab === 'reports' ? (
        <ReportsView onBackToDashboard={onBackToDashboard} />
      ) : (
        <AIAdvisorView onBackToDashboard={onBackToDashboard} />
      )}
    </div>
  );
};

export default ReportsAiView;
