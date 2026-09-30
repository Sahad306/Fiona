import React, { useState } from 'react';
import {
  Sparkles,
  Brain,
  Send,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  DollarSign,
  Lightbulb,
  ArrowRight,
  User,
  Bot,
  ArrowLeft,
  Download,
  Printer,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AIAdvisorViewProps {
  onBackToDashboard?: () => void;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({ onBackToDashboard }) => {
  const {
    profile,
    summary,
    transactions,
    budgets,
    savingsGoals,
    selectedMonth,
    formatCurrency,
    authToken,
  } = useFinance();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello ${profile.name}! I am your FINORA AI Financial Advisor. I've analyzed your cash flows, budgets, and savings goals for ${selectedMonth}. Your current Financial Health Score is **${summary.financialHealthScore}/100**. How can I assist you with budgeting, cutting expenses, or accelerating your savings goals today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [aiProvider, setAiProvider] = useState<'mistral' | 'gemini'>('gemini');

  // Suggested quick prompts
  const quickPrompts = [
    'How can I save an extra $300 this month?',
    'Audit my highest spending categories and find leaks',
    'How can I achieve my savings goals faster?',
    'Review my 50/30/20 budget breakdown',
  ];

  // Request comprehensive financial audit from backend AI API
  const handleGenerateAudit = async () => {
    if (!authToken) {
      setAuditReport({
        executiveSummary: 'Please log in to use the AI Financial Advisor.',
        actionableRecommendations: [],
        cutbackOpportunities: [],
      });
      return;
    }

    setIsGeneratingAudit(true);
    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          profile,
          summary,
          transactions: transactions.slice(0, 25),
          budgets,
          savingsGoals,
          month: selectedMonth,
          aiProvider,
          query: 'Generate a complete structured financial audit with recommendations and savings opportunities.',
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAuditReport(data.analysis);
      }
    } catch (err) {
      console.error('Audit generation error:', err);
      setAuditReport({
        executiveSummary: 'Failed to generate AI audit. Please try again.',
        actionableRecommendations: [],
        cutbackOpportunities: [],
      });
    } finally {
      setIsGeneratingAudit(false);
    }
  };

  // Send interactive chat message
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    if (!authToken) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'Please log in to use the AI Financial Advisor.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          profile,
          summary,
          transactions: transactions.slice(0, 25),
          budgets,
          savingsGoals,
          month: selectedMonth,
          aiProvider,
          query: textToSend,
        }),
      });

      const data = await response.json();
      const aiReply =
        data.reply ||
        (data.analysis
          ? `${data.analysis.executiveSummary}\n\n**Key Action Items:**\n${data.analysis.actionableRecommendations?.map((r: string) => `• ${r}`).join('\n')}`
          : 'I analyzed your financial data. Your spending is aligned with your targets. Keep maintaining your current savings rate.');

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `Based on your profile as a **${profile.role}**, your monthly savings rate of **${summary.savingsRate}%** is ${summary.savingsRate >= 20 ? 'strong' : 'moderate'}. To improve, consider reducing discretionary spending in your highest outflow category (${summary.topExpenseCategories[0]?.category || 'Shopping'}).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 65) return 'text-teal-400 border-teal-500/30 bg-teal-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="finora-ai-advisor-view">
      {/* Everything interactive is screen-only; the print statement renders at the end. */}
      <div className="print:hidden">
      {onBackToDashboard && (
        <button onClick={onBackToDashboard} className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
        </button>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {aiProvider === 'mistral' ? 'Mistral 14B AI Intelligence' : 'Gemini AI Intelligence'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400">Personalized Financial Diagnosis</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            AI Financial Advisor & Health Check
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pattern analysis, expense optimization, and interactive advisory chat.
          </p>
        </div>

        <button
          onClick={handleGenerateAudit}
          disabled={isGeneratingAudit}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
          id="generate-ai-audit-btn"
        >
          <Brain className="w-4 h-4" />
          <span>{isGeneratingAudit ? 'Analyzing Finances...' : 'Run Deep AI Audit'}</span>
        </button>
      </div>

      {/* Health Score & Key Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Financial Health Score Dial Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Financial Health Score
          </span>

          <div
            className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-lg transition-all ${getScoreColor(
              summary.financialHealthScore
            )}`}
          >
            <span className="text-3xl font-black tracking-tight text-white">
              {summary.financialHealthScore}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">/ 100</span>
          </div>

          <div className="mt-4">
            <span className="text-sm font-bold text-white">
              {summary.financialHealthScore >= 80
                ? 'Excellent Condition'
                : summary.financialHealthScore >= 65
                ? 'Good Health'
                : summary.financialHealthScore >= 50
                ? 'Fair / Needs Attention'
                : 'High Risk'}
            </span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Based on your savings rate ({summary.savingsRate}%), budget adherence ({summary.budgetUtilization.percentage}%), and goal progress.
            </p>
          </div>

          {/* Live score details — export only: Excel or Print PDF */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => {
                const score = summary.financialHealthScore;
                const condition = score >= 80 ? 'Excellent (80-100): strong savings, within budget, positive cash flow' : score >= 65 ? 'Good (65-79): healthy overall, minor leaks to fix' : score >= 50 ? 'Fair (50-64): needs attention — budget or savings slipping' : 'Worse / High Risk (0-49): over budget and/or negative cash flow — act now';
                const header = 'Item,Points,Max,Detail';
                const rows = summary.financialHealthBreakdown.map((r) =>
                  `"${r.label}",${r.points},${r.max || '-'},"${r.note.replace(/"/g, '""')}"`
                );
                const finalScore = `FINAL SCORE,${score},100,"${condition}"`;
                const csv = '\uFEFF' + [
                  'FINORA HEALTH SCORE REPORT',
                  `Period,${selectedMonth}`,
                  '',
                  'Condition Bands,Worse: 0-49,Good: 65-79,Fair: 50-64,Excellent: 80-100',
                  '',
                  header,
                  ...rows,
                  finalScore,
                ].join('\n');
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = `FINORA_Health_Score_Breakdown_${selectedMonth}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex flex-1 items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" /> Excel
            </button>
            <button
              onClick={() => window.print()}
              className="flex flex-1 items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3 h-3" /> Print PDF
            </button>
          </div>
        </div>

        {/* 2 Diagnostic Key Highlights */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            AI Health Diagnostic Highlights
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Savings Velocity</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5">
                Saving {formatCurrency(summary.monthlySavings)}/mo ({summary.savingsRate}% of total earnings).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Budget Adherence</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5">
                Utilizing {summary.budgetUtilization.percentage}% of overall budgeted limits this month.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Active Goals</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5">
                {savingsGoals.length} savings goals configured with ongoing monthly contributions.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Top Expense Pressure</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5">
                {summary.topExpenseCategories[0]?.category || 'General'} represents {summary.topExpenseCategories[0]?.percentage || 0}% of all outflows.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Deep Audit Section (If loaded) */}
      {auditReport && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                {aiProvider === 'mistral' ? 'Mistral 14B Full Financial Audit' : 'Gemini AI Full Financial Audit'}
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              AI Generated
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {auditReport.executiveSummary}
          </p>

          {auditReport.actionableRecommendations && (
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Actionable Recommendations
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {auditReport.actionableRecommendations.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {auditReport.cutbackOpportunities && (
            <div>
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                Identified Cutback Opportunities
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {auditReport.cutbackOpportunities.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Interactive Chat Console */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm flex flex-col h-[520px] overflow-hidden" id="ai-chat-console">
        {/* Chat Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">FINORA Assistant Chat</h3>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected to {aiProvider === 'mistral' ? 'Mistral 14B Latest' : 'Gemini Flash-Lite (latest)'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Model</p>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as 'mistral' | 'gemini')}
              className="mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="gemini">Gemini Flash-Lite (latest)</option>
              <option value="mistral">Mistral 14B Latest</option>
            </select>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-emerald-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-500 text-slate-950 font-medium'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 whitespace-pre-wrap'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`block text-[9px] mt-1.5 ${
                      isUser ? 'text-slate-900/70' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>FINORA AI is calculating financial insights...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
            Suggested:
          </span>
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => handleSendMessage(p)}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 bg-slate-950 border-t border-slate-800 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask FINORA AI about budgeting, saving, or investing..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
      </div>

      {/* ══════════ PRINT-ONLY HEALTH SCORE STATEMENT ══════════ */}
      <div className="hidden print:block text-slate-900">
        <div className="border-t-4 border-emerald-600 pt-3 mb-6">
          <div className="flex items-start justify-between pb-3 border-b border-slate-300">
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-900">FINORA</p>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Precision Wealth &amp; Personal Finance Intelligence</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-sm text-slate-900">FINANCIAL HEALTH STATEMENT</p>
              <p className="text-slate-500">Period: {selectedMonth}</p>
              <p className="text-slate-500">Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div>
            <p className="uppercase tracking-wider text-slate-500 font-bold mb-0.5">Prepared For</p>
            <p className="font-bold text-base">{profile.name}</p>
            <p className="text-slate-600">{profile.role}{profile.email ? ` • ${profile.email}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wider text-slate-500 font-bold mb-0.5">Financial Health Score</p>
            <p className={`font-black text-4xl ${summary.financialHealthScore >= 80 ? 'text-emerald-700' : summary.financialHealthScore >= 50 ? 'text-amber-600' : 'text-red-700'}`}>{summary.financialHealthScore}<span className="text-lg text-slate-500"> / 100</span></p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[['Excellent', '80-100', summary.financialHealthScore >= 80], ['Good', '65-79', summary.financialHealthScore >= 65 && summary.financialHealthScore < 80], ['Fair', '50-64', summary.financialHealthScore >= 50 && summary.financialHealthScore < 65], ['Worse / High Risk', '0-49', summary.financialHealthScore < 50]].map(([label, range, active]) => (
            <div key={label as string} className={`border rounded p-2.5 text-center ${active ? 'border-slate-800 border-2 bg-slate-50' : 'border-slate-200'}`}>
              <p className="text-[9px] uppercase font-black tracking-wider text-slate-600">{label}</p>
              <p className="text-sm font-black text-slate-900">{range}</p>
              {active && <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">You are here</p>}
            </div>
          ))}
        </div>

        <p className="text-sm font-black uppercase tracking-wider text-slate-800 mb-2">Points Ledger — Earnings &amp; Penalties</p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-left font-black uppercase text-[10px] tracking-wider text-slate-700">Item</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-left font-black uppercase text-[10px] tracking-wider text-slate-700">Detail</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Max</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Points</th>
            </tr>
          </thead>
          <tbody>
            {summary.financialHealthBreakdown.map((row, i) => (
              <tr key={row.label} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                <td className="border-b border-slate-200 px-2.5 py-1.5 font-semibold text-slate-900">{row.label}</td>
                <td className="border-b border-slate-200 px-2.5 py-1.5 text-slate-600">{row.note}</td>
                <td className="border-b border-slate-200 px-2.5 py-1.5 text-right text-slate-500">{row.max > 0 ? row.max : '—'}</td>
                <td className={`border-b border-slate-200 px-2.5 py-1.5 text-right font-black ${row.points < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {row.points > 0 && row.max > 0 ? `+${row.points}` : row.points}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border-t-2 border-slate-800 px-2.5 py-2 font-black text-slate-900" colSpan={3}>Final Score</td>
              <td className="border-t-2 border-slate-800 px-2.5 py-2 text-right font-black text-slate-900">{summary.financialHealthScore} / 100</td>
            </tr>
          </tfoot>
        </table>

        <div className="print-keep-together mt-10 flex items-end justify-between">
          <div className="border-t border-slate-400 pt-1 w-56 text-[10px] text-slate-500">Client Signature</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xl">F</div>
            <div>
              <p className="text-base font-black tracking-tight text-emerald-700">Produced by FINORA</p>
              <p className="text-[8px] uppercase tracking-[0.3em] text-slate-500">Precision • Clarity • Prosperity</p>
            </div>
          </div>
          <div className="w-56"></div>
        </div>
        <p className="text-[9px] text-slate-400 border-t border-slate-200 pt-2 mt-4">
          This health statement was generated by FINORA on {new Date().toLocaleString('en-GB')} for the selected period. Scores reflect savings rate, budget discipline, cash flow, goal progress, and applicable penalties. For internal and personal use.
        </p>
      </div>
    </div>
  );
};
