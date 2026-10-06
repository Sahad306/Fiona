import React, { useState, useMemo, useEffect } from 'react';
import { MonthPicker } from './MonthPicker';
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
  Sparkles,
  Save,
  Trash2,
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
import type { SavedReport } from '../types';

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
    authToken,
    savedReports,
    saveCurrentReport,
    deleteSavedReport,
    autoSavePreviousMonth,
    buildSnapshot,
  } = useFinance();

  const [reportPeriod, setReportPeriod] = useState<'month' | 'ytd'>('month');
  const [printReport, setPrintReport] = useState<SavedReport | null>(null);

  // Auto-save previous month on mount
  useEffect(() => {
    autoSavePreviousMonth();
  }, [autoSavePreviousMonth]);

  const [saveMsg, setSaveMsg] = useState<string>('');
  const handleSaveReport = async () => {
    const result = await saveCurrentReport();
    if (result.success) {
      setSaveMsg(`✅ ${selectedMonth} report saved!`);
      setTimeout(() => setSaveMsg(''), 3000);
    } else {
      setSaveMsg('⚠️ No transactions found for this month.');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleExportPDF = (report: SavedReport) => {
    setPrintReport(report);
    setTimeout(() => window.print(), 100);
  };

  const handlePrintCurrent = () => {
    const currentSnapshot = buildSnapshot(selectedMonth);
    if (!currentSnapshot) {
      alert('No transactions for this month.');
      return;
    }
    // Temporarily set printReport to current data (does NOT save to DB)
    setPrintReport({
      ...currentSnapshot,
      id: 'temp-' + Date.now(),
      savedAt: new Date().toISOString(),
      isTemporary: true,
    });
    setTimeout(() => window.print(), 100);
  };

  const handleExportExcel = (report: SavedReport) => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method'];
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = report.transactions.map((t) =>
      [escape(t.date), escape(t.type), escape(t.category), escape(t.description), t.amount, escape(t.paymentMethod)].join(',')
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Finora_Report_${report.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteReport = (id: string) => {
    if (window.confirm('Delete this saved report?')) {
      deleteSavedReport(id);
    }
  };

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

  const [advisorNote, setAdvisorNote] = useState<string>('');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  const generateAdvisorNote = async () => {
    setIsGeneratingNote(true);
    const fallbackNote = `This period recorded ${reportTransactions.length} transactions with ${formatCurrency(totalIncome)} inflow against ${formatCurrency(totalExpense)} outflow, leaving ${formatCurrency(netSavings)} net cash flow (${savingsRate}% savings rate). ${savingsRate >= 20 ? 'Your savings velocity is strong — stay the course.' : 'Trimming your top spending category would lift your savings rate meaningfully.'}`;
    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          profile,
          summary,
          transactions: reportTransactions.slice(0, 25),
          budgets,
          savingsGoals,
          month: selectedMonth,
          query: "Write an advisor's note for the client's financial statement. Requirements: plain flowing prose only — NO bullet points, NO lists, NO markdown, NO headings, NO bold. Exactly 3 sentences: one on overall financial health this period, then two specific actionable recommendations woven naturally into the text. Professional, formal, written like a bank statement remark.",
        }),
      });
      const data = await res.json();
      let note = '';
      if (data.reply) {
        note = data.reply;
      } else if (data.analysis) {
        note = [
          data.analysis.executiveSummary,
          ...(data.analysis.actionableRecommendations || []).slice(0, 2).map((r: string) => `• ${r}`),
        ].filter(Boolean).join('\n');
      }
      setAdvisorNote(note.trim() || fallbackNote);
    } catch {
      setAdvisorNote(fallbackNote);
    } finally {
      setIsGeneratingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="finora-reports-view">
      {/* Everything interactive is screen-only; the print document renders below. */}
      <div className="print:hidden">
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
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />

          <button
            onClick={() => exportCSV('all')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Download CSV Ledger"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={generateAdvisorNote}
            disabled={isGeneratingNote}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingNote ? 'Generating…' : advisorNote ? 'Regenerate Note' : 'AI Advisor Note'}</span>
          </button>

          <button
            onClick={handlePrintCurrent}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Generate PDF from current month data"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current</span>
          </button>

          <button
            onClick={handleSaveReport}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Save this month's report snapshot"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Report</span>
          </button>

          {saveMsg && (
            <span className={`text-xs font-bold px-3 py-2 rounded-xl border ${
              saveMsg.startsWith('✅') 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
              {saveMsg}
            </span>
          )}
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

      {/* ══════════ PRINT-ONLY PROFESSIONAL STATEMENT ══════════ */}
      <div className="hidden print:block text-slate-900">
        {/* Letterhead — emerald accent bar keeps it branded but light */}
        <div className="border-t-4 border-emerald-600 pt-3 mb-6">
          <div className="flex items-start justify-between pb-3 border-b border-slate-300">
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-900">FINORA</p>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Precision Wealth &amp; Personal Finance Intelligence</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-sm text-slate-900">FINANCIAL STATEMENT</p>
              <p className="text-slate-500">Period: {selectedMonth}</p>
              <p className="text-slate-500">Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Client block */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div>
            <p className="uppercase tracking-wider text-slate-500 font-bold mb-0.5">Prepared For</p>
            <p className="font-bold text-base">{profile.name}</p>
            <p className="text-slate-600">{profile.role}{profile.email ? ` • ${profile.email}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wider text-slate-500 font-bold mb-0.5">Net Cash Flow</p>
            <p className={`font-black text-2xl ${netSavings >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(netSavings)}</p>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-4 gap-3 mb-6 mt-6">
          <div className="border border-slate-300 rounded p-3">
            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Total Income</p>
            <p className="text-lg font-black text-emerald-700">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Total Expenses</p>
            <p className="text-lg font-black text-red-700">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Savings Rate</p>
            <p className="text-lg font-black text-slate-900">{savingsRate}%</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Transactions</p>
            <p className="text-lg font-black text-slate-900">{reportTransactions.length}</p>
          </div>
        </div>

        {/* Category audit table */}
        <p className="text-sm font-black uppercase tracking-wider text-slate-800 mb-2">Category Spending Audit &amp; Variance</p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-left font-black uppercase text-[10px] tracking-wider text-slate-700">Category</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Entries</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Spent</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Share</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Budget</th>
              <th className="border-b-2 border-slate-800 px-2.5 py-2 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Variance</th>
            </tr>
          </thead>
          <tbody>
            {categoryBreakdown.map((row, i) => (
              <tr key={row.category} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                <td className="border-b border-slate-200 px-2.5 py-1.5 font-semibold text-slate-900">{row.category}</td>
                <td className="border-b border-slate-200 px-2.5 py-1.5 text-right text-slate-600">{row.count}</td>
                <td className="border-b border-slate-200 px-2.5 py-1.5 text-right font-bold text-slate-900">{formatCurrency(row.spent)}</td>
                <td className="border-b border-slate-200 px-2.5 py-1.5 text-right text-slate-600">{row.percentage}%</td>
                <td className="border-b border-slate-200 px-2.5 py-1.5 text-right text-slate-600">{row.budget > 0 ? formatCurrency(row.budget) : '—'}</td>
                <td className={`border-b border-slate-200 px-2.5 py-1.5 text-right font-bold ${row.budget > 0 ? (row.variance >= 0 ? 'text-emerald-700' : 'text-red-600') : 'text-slate-400'}`}>
                  {row.budget > 0 ? (row.variance >= 0 ? `+${formatCurrency(row.variance)}` : `−${formatCurrency(Math.abs(row.variance))}`) : 'No limit'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border-t-2 border-slate-800 px-2.5 py-2 font-black text-slate-900" colSpan={2}>Total</td>
              <td className="border-t-2 border-slate-800 px-2.5 py-2 text-right font-black text-slate-900">{formatCurrency(totalExpense)}</td>
              <td className="border-t-2 border-slate-800 px-2.5 py-2" colSpan={3}></td>
            </tr>
          </tfoot>
        </table>

        {/* Signature + Produced-by brand block */}
        {advisorNote && (
          <div className="print-keep-together mt-8 border-t border-slate-300 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">Advisor's Note</p>
            <p className="text-[11.5px] text-slate-800 leading-relaxed text-justify" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {advisorNote.replace(/\*\*/g, '').replace(/^[•\-\u2022\u2013\u2014]\s*/gm, '').trim()}
            </p>
          </div>
        )}

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
        <p className="text-[9px] text-slate-400 border-t border-slate-200 pt-2">
          This statement was generated by FINORA on {new Date().toLocaleString('en-GB')} and reflects transactions recorded for the selected period. For internal and personal use.
        </p>
      </div>

      {/* ══════════ REPORT HISTORY ARCHIVE ══════════ */}
      <div className="print:hidden mt-8">
        <h2 className="text-lg font-black text-white tracking-tight mb-4 flex items-center gap-2">
          <span>📁</span> Report History
        </h2>

        {savedReports.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
            <p className="text-slate-400 text-sm">No saved reports yet. Click "Save Report" to archive the current month.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...savedReports].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map((report) => (
              <div key={report.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{report.month}</span>
                    <span className="text-[10px] text-slate-500">Saved {new Date(report.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-emerald-400">Income: {formatCurrency(report.totalIncome)}</span>
                    <span className="text-rose-400">Expenses: {formatCurrency(report.totalExpenses)}</span>
                    <span className={report.netSavings >= 0 ? 'text-teal-400' : 'text-red-400'}>Net: {formatCurrency(report.netSavings)}</span>
                    <span className="text-slate-400">{report.transactionCount} txns</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleExportPDF(report)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    title="Print as PDF"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => handleExportExcel(report)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    title="Download Excel CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors cursor-pointer"
                    title="Delete saved report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ HIDDEN PRINT AREA FOR SAVED REPORT PDF ══════════ */}
      {printReport && (
        <div id="report-print-area" className="hidden print:block text-slate-900">
          <div className="border-t-4 border-emerald-600 pt-3 mb-6">
            <div className="flex items-start justify-between pb-3 border-b border-slate-300">
              <div>
                <p className="text-2xl font-black tracking-tight text-slate-900">FINORA</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500">Archived Financial Report</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-sm text-slate-900">SAVED REPORT</p>
                <p className="text-slate-500">Period: {printReport.month}</p>
                <p className="text-slate-500">Saved: {new Date(printReport.savedAt).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="border border-slate-300 rounded p-3">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Total Income</p>
              <p className="text-lg font-black text-emerald-700">{formatCurrency(printReport.totalIncome)}</p>
            </div>
            <div className="border border-slate-300 rounded p-3">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Total Expenses</p>
              <p className="text-lg font-black text-red-700">{formatCurrency(printReport.totalExpenses)}</p>
            </div>
            <div className="border border-slate-300 rounded p-3">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Net Savings</p>
              <p className={`text-lg font-black ${printReport.netSavings >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(printReport.netSavings)}</p>
            </div>
            <div className="border border-slate-300 rounded p-3">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Savings Rate</p>
              <p className="text-lg font-black text-slate-900">{printReport.savingsRate}%</p>
            </div>
          </div>
          <p className="text-sm font-black uppercase tracking-wider text-slate-800 mb-2">Category Breakdown</p>
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr>
                <th className="border-b-2 border-slate-800 px-2 py-1.5 text-left font-black uppercase text-[10px] text-slate-700">Category</th>
                <th className="border-b-2 border-slate-800 px-2 py-1.5 text-right font-black uppercase text-[10px] text-slate-700">Spent</th>
                <th className="border-b-2 border-slate-800 px-2 py-1.5 text-right font-black uppercase text-[10px] text-slate-700">Share</th>
              </tr>
            </thead>
            <tbody>
              {printReport.categoryBreakdown.map((row, i) => (
                <tr key={row.category} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                  <td className="border-b border-slate-200 px-2 py-1 font-semibold text-slate-900">{row.category}</td>
                  <td className="border-b border-slate-200 px-2 py-1 text-right font-bold text-slate-900">{formatCurrency(row.spent)}</td>
                  <td className="border-b border-slate-200 px-2 py-1 text-right text-slate-600">{row.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm font-black uppercase tracking-wider text-slate-800 mb-2">Transactions</p>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                <th className="border-b-2 border-slate-800 px-2 py-1 text-left font-black uppercase text-slate-700">Date</th>
                <th className="border-b-2 border-slate-800 px-2 py-1 text-left font-black uppercase text-slate-700">Type</th>
                <th className="border-b-2 border-slate-800 px-2 py-1 text-left font-black uppercase text-slate-700">Category</th>
                <th className="border-b-2 border-slate-800 px-2 py-1 text-left font-black uppercase text-slate-700">Description</th>
                <th className="border-b-2 border-slate-800 px-2 py-1 text-right font-black uppercase text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {printReport.transactions.map((tx, i) => (
                <tr key={tx.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                  <td className="border-b border-slate-200 px-2 py-0.5 text-slate-600">{tx.date}</td>
                  <td className="border-b border-slate-200 px-2 py-0.5 font-semibold text-slate-900">{tx.type}</td>
                  <td className="border-b border-slate-200 px-2 py-0.5 text-slate-600">{tx.category}</td>
                  <td className="border-b border-slate-200 px-2 py-0.5 text-slate-600">{tx.description}</td>
                  <td className={`border-b border-slate-200 px-2 py-0.5 text-right font-bold ${tx.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
