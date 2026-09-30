import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { IncomeView } from './components/IncomeView';
import { ExpensesView } from './components/ExpensesView';
import { PlanningView, PlanningTab } from './components/PlanningView';
import { ReportsAiView, ReportsAiTab } from './components/ReportsAiView';
import { TransactionModal } from './components/TransactionModal';
import { AuthModal } from './components/AuthModal';
import { AuthGateway } from './components/AuthGateway';
import { SmartImportModal } from './components/SmartImportModal';
import { Transaction } from './types';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, currentUser } = useFinance();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [budgetGoalsTab, setBudgetGoalsTab] = useState<PlanningTab>('budgets');
  const [reportsAiTab, setReportsAiTab] = useState<ReportsAiTab>('reports');
  const [guestPreview, setGuestPreview] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);

  // If user is not authenticated and hasn't selected guest preview, render the Auth Gateway
  if (!isAuthenticated && !currentUser && !guestPreview) {
    return <AuthGateway onEnterGuest={() => setGuestPreview(true)} />;
  }

  const handleOpenTransactionModal = (type: 'income' | 'expense' = 'expense') => {
    setEditingTransaction(null);
    setTxModalType(type);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxModalType(tx.type);
    setIsTxModalOpen(true);
  };

  const handleDepositGoal = (goalId: string) => {
    setDepositGoalId(goalId);
    setBudgetGoalsTab('savings');
    setActiveTab('budget-goals');
  };

  // 'budgets' and 'savings' are merged into one screen; redirect legacy ids
  // and remember which sub-tab they were asking for.
  const handleSetActiveTab = (tab: string) => {
    if (tab === 'budgets' || tab === 'savings') {
      setBudgetGoalsTab(tab);
      setActiveTab('budget-goals');
      return;
    }
    if (tab === 'reports' || tab === 'advisor' || tab === 'ai-advisor') {
      setReportsAiTab(tab === 'reports' ? 'reports' : 'advisor');
      setActiveTab('reports-ai');
      return;
    }
    setActiveTab(tab);
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenAuthModal={handleOpenAuth}
        onOpenSmartImport={() => setIsSmartImportOpen(true)}
        onSignOut={() => setGuestPreview(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            onOpenTransactionModal={handleOpenTransactionModal}
            setActiveTab={handleSetActiveTab}
            onDepositGoal={handleDepositGoal}
          />
        )}

        {activeTab === 'income' && (
          <IncomeView
            onOpenTransactionModal={handleOpenTransactionModal}
            onEditTransaction={handleEditTransaction}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            onOpenTransactionModal={handleOpenTransactionModal}
            onEditTransaction={handleEditTransaction}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'budget-goals' && (
          <PlanningView
            tab={budgetGoalsTab}
            onTabChange={setBudgetGoalsTab}
            initialDepositGoalId={depositGoalId}
            onClearInitialDepositGoal={() => setDepositGoalId(null)}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'reports-ai' && (
          <ReportsAiView
            tab={reportsAiTab}
            onTabChange={setReportsAiTab}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 tracking-wider">
              FINORA
            </span>
            <span className="text-slate-400">— Precision Wealth & Personal Finance Intelligence System</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span>Encrypted Ledger Storage</span>
            <span>•</span>
            <span>Gemini AI Intelligence</span>
            <span>•</span>
            <span>PBKDF2 Security</span>
          </div>
        </div>
      </footer>

      {/* Shared Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        initialType={txModalType}
        editingTransaction={editingTransaction}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <FinanceProvider>
      <MainAppContent />
    </FinanceProvider>
  );
}

export default App;
