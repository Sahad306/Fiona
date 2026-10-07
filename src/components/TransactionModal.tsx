import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  CreditCard,
  Tag,
  FileText,
  DollarSign,
  Wallet,
  Loader2,
  Briefcase,
  Laptop,
  Building2,
  TrendingUp,
  GraduationCap,
  Zap,
  Home,
  Gift,
  Coffee,
  Utensils,
  ShoppingBag,
  HeartPulse,
  Film,
  Plane,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Calculator,
  CalendarDays,
  Check,
  Percent,
  Split,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_SOURCES,
  PAYMENT_METHODS,
  MONTHLY_SECTOR_CONFIGS,
  BANGLADESH_DAILY_PRESETS,
} from '../data/defaultData';
import { Transaction, PaymentMethod, SectorSplit } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  initialExpenseMode?: 'daily' | 'monthly';
  editingTransaction?: Transaction | null;
}

// Income source metadata with icons & helper text
const INCOME_SOURCE_DETAILS: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
  Salary: { icon: <Briefcase className="w-4 h-4 text-emerald-400" />, label: 'Salary & Wages', desc: 'Primary monthly employment paycheck' },
  Freelancing: { icon: <Laptop className="w-4 h-4 text-teal-400" />, label: 'Freelancing & Contracts', desc: 'Upwork, Fiverr & client milestones' },
  Business: { icon: <Building2 className="w-4 h-4 text-blue-400" />, label: 'Business & Sales', desc: 'Product revenue & commerce profits' },
  Investments: { icon: <TrendingUp className="w-4 h-4 text-indigo-400" />, label: 'Investments & DPS', desc: 'Stocks, savings certificates & dividends' },
  Allowances: { icon: <Gift className="w-4 h-4 text-pink-400" />, label: 'Family Allowances', desc: 'Family support & education grants' },
  'Rental Income': { icon: <Home className="w-4 h-4 text-amber-400" />, label: 'Rental Income', desc: 'Property, sublease & tenant revenue' },
  'Side Hustle': { icon: <Zap className="w-4 h-4 text-amber-300" />, label: 'Tuition & Side Hustle', desc: 'Coaching, mentoring & extra income' },
  Gifts: { icon: <Gift className="w-4 h-4 text-purple-400" />, label: 'Awards & Stipends', desc: 'Academic scholarship & gifts' },
  Other: { icon: <Wallet className="w-4 h-4 text-slate-400" />, label: 'Other Inflows', desc: 'Miscellaneous incoming funds' },
};

// Expense sectors metadata
const EXPENSE_SECTOR_DETAILS: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
  'Food & Dining': { icon: <Utensils className="w-4 h-4 text-emerald-400" />, label: 'Food & Dining', desc: 'Daily meals, mess bill, cafeteria, dining' },
  'Housing & Rent': { icon: <Home className="w-4 h-4 text-indigo-400" />, label: 'Housing & Rent', desc: 'Apartment rent, hostel, mess seat' },
  'Household & Living': { icon: <Layers className="w-4 h-4 text-teal-400" />, label: 'Household & Bazaar', desc: 'Supermarket grocery, cleaning, maid' },
  'Utilities & Bills': { icon: <Zap className="w-4 h-4 text-amber-400" />, label: 'Utilities & Bills', desc: 'Electricity, gas, water, WiFi, mobile' },
  Transportation: { icon: <TrendingUp className="w-4 h-4 text-blue-400" />, label: 'Transportation', desc: 'Metro rail, rickshaw, bus, fuel, Uber' },
  Education: { icon: <GraduationCap className="w-4 h-4 text-violet-400" />, label: 'Education & Study', desc: 'Tuition, books, courses, exam fees' },
  Shopping: { icon: <ShoppingBag className="w-4 h-4 text-pink-400" />, label: 'Shopping & Apparel', desc: 'Clothing, gadgets, accessories' },
  'Healthcare & Medical': { icon: <HeartPulse className="w-4 h-4 text-rose-400" />, label: 'Healthcare & Medical', desc: 'Pharmacy medicines, doctor, tests' },
  Entertainment: { icon: <Film className="w-4 h-4 text-cyan-400" />, label: 'Entertainment', desc: 'Streaming, movies, gaming, outings' },
  'Personal Care': { icon: <HeartPulse className="w-4 h-4 text-teal-300" />, label: 'Personal Care', desc: 'Grooming, salon, personal items' },
  Travel: { icon: <Plane className="w-4 h-4 text-orange-400" />, label: 'Travel & Trips', desc: 'Vacation, train tickets, hotel stays' },
  Other: { icon: <Wallet className="w-4 h-4 text-slate-400" />, label: 'Other Outflows', desc: 'Miscellaneous expenses' },
};

// Payment Rail Branding & Colors
const PAYMENT_RAIL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  bKash: { bg: 'bg-pink-950/40 hover:bg-pink-900/50', text: 'text-pink-400', border: 'border-pink-500/40' },
  Nagad: { bg: 'bg-orange-950/40 hover:bg-orange-900/50', text: 'text-orange-400', border: 'border-orange-500/40' },
  Rocket: { bg: 'bg-purple-950/40 hover:bg-purple-900/50', text: 'text-purple-400', border: 'border-purple-500/40' },
  'Bank Transfer': { bg: 'bg-emerald-950/40 hover:bg-emerald-900/50', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  Cash: { bg: 'bg-amber-950/40 hover:bg-amber-900/50', text: 'text-amber-400', border: 'border-amber-500/40' },
  'Credit Card': { bg: 'bg-blue-950/40 hover:bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-500/40' },
  'Debit Card': { bg: 'bg-cyan-950/40 hover:bg-cyan-900/50', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  'UPI / Online': { bg: 'bg-indigo-950/40 hover:bg-indigo-900/50', text: 'text-indigo-400', border: 'border-indigo-500/40' },
  Other: { bg: 'bg-slate-900 hover:bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  initialExpenseMode = 'daily',
  editingTransaction = null,
}) => {
  const { addTransaction, addMultipleTransactions, updateTransaction, profile, formatCurrency } = useFinance();

  // Top level type: Income vs Expense
  const [type, setType] = useState<'income' | 'expense'>(initialType);

  // Expense Mode: 'daily' vs 'monthly'
  const [expenseMode, setExpenseMode] = useState<'daily' | 'monthly'>(initialExpenseMode);

  // General Form States
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bKash');
  const [recurring, setRecurring] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [payerOrClient, setPayerOrClient] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Daily Routine Mode
  const [isDailyRoutineEnabled, setIsDailyRoutineEnabled] = useState<boolean>(false);
  const [dailyRateInput, setDailyRateInput] = useState<string>('');
  const [totalMonthDays, setTotalMonthDays] = useState<number>(30);
  const [offDaysCount, setOffDaysCount] = useState<number>(4);
  const [offDaysReason, setOffDaysReason] = useState<string>('Weekend / Holiday');
  const [saveAsRoutineMonthlyTotal, setSaveAsRoutineMonthlyTotal] = useState<boolean>(false);

  // all the cost together for a month
  const [monthlySectorsState, setMonthlySectorsState] = useState<
    Array<{
      key: string;
      category: string;
      label: string;
      desc: string;
      enabled: boolean;
      amount: string;
      paymentMethod: PaymentMethod;
      notes: string;
    }>
  >(() =>
    MONTHLY_SECTOR_CONFIGS.map((sec) => ({
      key: sec.key,
      category: sec.category,
      label: sec.label,
      desc: sec.desc,
      enabled: true,
      amount: sec.defaultAmount.toString(),
      paymentMethod: sec.defaultMethod,
      notes: '',
    }))
  );

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setRecurring(editingTransaction.recurring || 'none');
      setPayerOrClient(editingTransaction.payerOrClient || '');
      setTags(editingTransaction.tags || []);
      setNotes(editingTransaction.notes || '');

      if (editingTransaction.dailyConfig) {
        setIsDailyRoutineEnabled(true);
        setDailyRateInput(editingTransaction.dailyConfig.dailyRate.toString());
        setTotalMonthDays(editingTransaction.dailyConfig.totalDaysInMonth || 30);
        setOffDaysCount(editingTransaction.dailyConfig.offDaysCount || 0);
        setOffDaysReason(editingTransaction.dailyConfig.offDaysReason || '');
      } else {
        setIsDailyRoutineEnabled(false);
      }

      setExpenseMode(editingTransaction.expenseMode || 'daily');
    } else {
      setType(initialType);
      setExpenseMode(initialExpenseMode);
      setAmount('');
      setCategory(initialType === 'income' ? DEFAULT_INCOME_SOURCES[0] : DEFAULT_EXPENSE_CATEGORIES[0]);
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(initialType === 'income' ? 'Bank Transfer' : 'bKash');
      setRecurring('none');
      setPayerOrClient('');
      setTags([]);
      setNotes('');
      setIsDailyRoutineEnabled(false);
      setDailyRateInput('');
      setTotalMonthDays(30);
      setOffDaysCount(4);
      setOffDaysReason('Weekend / Holiday');
      setSaveAsRoutineMonthlyTotal(false);
    }
  }, [editingTransaction, initialType, initialExpenseMode, isOpen]);

  // Real-time calculation for Daily Routine with Off-Days
  const calculatedRoutine = useMemo(() => {
    const rate = parseFloat(dailyRateInput || amount) || 0;
    const days = Math.max(1, totalMonthDays);
    const off = Math.max(0, Math.min(offDaysCount, days));
    const activeDays = days - off;
    const monthlyTotal = activeDays * rate;

    return {
      rate,
      days,
      off,
      activeDays,
      monthlyTotal,
    };
  }, [dailyRateInput, amount, totalMonthDays, offDaysCount]);

  // Monthly Matrix Summary
  const monthlySectorsTotal = useMemo(() => {
    return monthlySectorsState
      .filter((s) => s.enabled && parseFloat(s.amount) > 0)
      .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  }, [monthlySectorsState]);

  const enabledMonthlyCount = useMemo(() => {
    return monthlySectorsState.filter((s) => s.enabled && parseFloat(s.amount) > 0).length;
  }, [monthlySectorsState]);

  if (!isOpen) return null;

  // Handle Quick Chip Bumps
  const handleAmountBump = (add: number) => {
    const curr = parseFloat(amount) || 0;
    const next = (curr + add).toString();
    setAmount(next);
    if (isDailyRoutineEnabled && !dailyRateInput) {
      setDailyRateInput(next);
    }
  };

  // Quick Daily Preset Selected
  const handleDailyPresetSelect = (preset: (typeof BANGLADESH_DAILY_PRESETS)[0]) => {
    setAmount(preset.amount.toString());
    setCategory(preset.category);
    setDescription(preset.label);
    setDailyRateInput(preset.amount.toString());
  };

  // Tag Management
  const handleAddTag = (newTag?: string) => {
    const t = (newTag || tagInput).trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      if (!newTag) setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Submit Single Transaction (Income or Daily / Single Expense)
  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    let finalAmount = parsedAmount;
    let finalDesc = description || (type === 'income' ? `${category} Income` : `${category} Expense`);
    let finalRecurring = recurring;

    let dailyConfigData = undefined;
    if (type === 'expense' && isDailyRoutineEnabled) {
      dailyConfigData = {
        dailyRate: calculatedRoutine.rate,
        totalDaysInMonth: calculatedRoutine.days,
        offDaysCount: calculatedRoutine.off,
        offDaysReason: offDaysReason,
        calculatedMonthlyTotal: calculatedRoutine.monthlyTotal,
      };

      if (saveAsRoutineMonthlyTotal) {
        finalAmount = calculatedRoutine.monthlyTotal;
        finalDesc = `${finalDesc} (${calculatedRoutine.activeDays} Active Days × ${formatCurrency(calculatedRoutine.rate)})`;
        finalRecurring = 'monthly';
      }
    }

    const txData: Omit<Transaction, 'id' | 'createdAt'> = {
      type,
      amount: finalAmount,
      category,
      description: finalDesc,
      date,
      paymentMethod,
      recurring: finalRecurring,
      payerOrClient: payerOrClient.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes.trim() || undefined,
      expenseMode: type === 'expense' ? expenseMode : undefined,
      dailyConfig: dailyConfigData,
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, txData);
    } else {
      addTransaction(txData);
    }

    onClose();
  };

  // Submit Batch Monthly Sectors (Option 2: Monthly Mode)
  const handleSubmitMonthlySectors = (e: React.FormEvent) => {
    e.preventDefault();
    const activeItems = monthlySectorsState.filter((s) => s.enabled && parseFloat(s.amount) > 0);
    if (activeItems.length === 0) return;

    const txBatch: Array<Omit<Transaction, 'id' | 'createdAt'>> = activeItems.map((item) => ({
      type: 'expense',
      amount: parseFloat(item.amount),
      category: item.category,
      description: item.label,
      date: date,
      paymentMethod: item.paymentMethod,
      recurring: 'monthly',
      expenseMode: 'monthly',
      notes: item.notes.trim() || undefined,
      tags: ['MonthlyCost', item.category.replace(/\s+/g, '')],
    }));

    addMultipleTransactions(txBatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        id="finora-transaction-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {type === 'income' ? <ArrowUpRight className="w-5 h-5 stroke-[2.5]" /> : <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                {editingTransaction
                  ? `Edit ${editingTransaction.type === 'income' ? 'Income Deposit' : 'Expense'}`
                  : type === 'income'
                  ? 'Add Income Inflow'
                  : 'Add Expense Outflow'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {type === 'income'
                  ? 'Record salary, freelancing, tuition, gifts & business revenues'
                  : 'Choose between Daily Routine with Off-Days or Ready Monthly Sectors'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Type Selector: Income vs Expense */}
        {!editingTransaction && (
          <div className="px-6 pt-4 pb-2">
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 gap-1">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
                }}
                className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'expense'
                    ? 'bg-gradient-to-r from-rose-500/30 to-amber-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                <span>EXPENSE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory(DEFAULT_INCOME_SOURCES[0]);
                }}
                className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'income'
                    ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>INCOME</span>
              </button>
            </div>
          </div>
        )}

        {/*  USER REQUEST CORE: TWO CLEAR OPTIONS FOR EXPENSE (DAILY vs MONTHLY) */}
        {type === 'expense' && !editingTransaction && (
          <div className="px-6 py-2">
            <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-1.5 px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Expense Structure Selection
                </span>
                <span className="text-[10px] text-amber-400 font-medium">
                  {expenseMode === 'daily' ? ' Daily Mode Active' : ' Monthly Sectors Active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* OPTION 1: DAILY EXPENSE MODE */}
                <button
                  type="button"
                  onClick={() => setExpenseMode('daily')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    expenseMode === 'daily'
                      ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        expenseMode === 'daily'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-amber-400'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">OPTION 1: Daily Expense</span>
                        {expenseMode === 'daily' && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                      </div>
                      <span className="text-[10px] text-amber-300 font-semibold block">
                        Daily Expenses & Routine Calculation (with Off-Days)
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Add daily meals, transport & auto-calculate monthly total by subtracting missed / off-days.
                  </p>
                </button>

                {/* OPTION 2: MONTHLY EXPENSE MODE */}
                <button
                  type="button"
                  onClick={() => setExpenseMode('monthly')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    expenseMode === 'monthly'
                      ? 'bg-gradient-to-br from-indigo-500/20 via-slate-900 to-slate-900 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        expenseMode === 'monthly'
                          ? 'bg-indigo-500 text-white font-black'
                          : 'bg-slate-800 text-indigo-400'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">OPTION 2: Monthly Costs</span>
                        {expenseMode === 'monthly' && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                        )}
                      </div>
                      <span className="text-[10px] text-indigo-300 font-semibold block">
                        Monthly Matrix (Rent, Utilities & Bills)
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Preset monthly options: Rent, WiFi, Bills, Cleaning. Just enter amount & payment method.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: MONTHLY SECTORS MATRIX (OPTION 2)                                */}
        {/* ========================================================================= */}
        {type === 'expense' && expenseMode === 'monthly' && !editingTransaction ? (
          <form onSubmit={handleSubmitMonthlySectors} className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Ready Monthly Expense Checklist
                    </h3>
                    <p className="text-[11px] text-indigo-300">
                      Standard monthly sectors are ready. Simply input the <strong>Amount</strong> & <strong>Payment Method</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Monthly Sum</span>
                  <span className="text-base font-black text-indigo-300 font-mono">
                    {formatCurrency(monthlySectorsTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Date selector for monthly batch */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Target Month & Date:
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Monthly Sector Items Table / List */}
            <div className="space-y-2.5">
              {monthlySectorsState.map((sec, idx) => (
                <div
                  key={sec.key}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    sec.enabled
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Checkbox & Label */}
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={(e) => {
                          const next = [...monthlySectorsState];
                          next[idx].enabled = e.target.checked;
                          setMonthlySectorsState(next);
                        }}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-white">{sec.label}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 block">{sec.desc}</span>
                      </div>
                    </div>

                    {/* Amount & Dealing Way Controls */}
                    {sec.enabled && (
                      <div className="flex items-center space-x-2.5 self-end sm:self-auto shrink-0">
                        {/* Amount Input */}
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400">
                            {profile.currencySymbol || 'Tk'}
                          </span>
                          <input
                            type="number"
                            value={sec.amount}
                            onChange={(e) => {
                              const next = [...monthlySectorsState];
                              next[idx].amount = e.target.value;
                              setMonthlySectorsState(next);
                            }}
                            placeholder="Amount"
                            className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-black text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right"
                          />
                        </div>

                        {/* Payment Method */}
                        <select
                          value={sec.paymentMethod}
                          onChange={(e) => {
                            const next = [...monthlySectorsState];
                            next[idx].paymentMethod = e.target.value as PaymentMethod;
                            setMonthlySectorsState(next);
                          }}
                          className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                          {PAYMENT_METHODS.map((pm) => (
                            <option key={pm} value={pm}>
                              {pm}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions for Monthly Sectors */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between sticky bottom-0 bg-slate-900 py-3">
              <div>
                <span className="text-xs text-slate-400 block">
                  {enabledMonthlyCount} sectors selected
                </span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  Total: {formatCurrency(monthlySectorsTotal)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={monthlySectorsTotal <= 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Commit All Monthly Costs ({formatCurrency(monthlySectorsTotal)})</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: DAILY EXPENSE / SINGLE EXPENSE / INCOME FORM                      */
          /* ========================================================================= */
          <form onSubmit={handleSubmitSingle} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Quick Presets for Daily Expenses */}
            {type === 'expense' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Quick 1-Click Daily Presets
                  </label>
                  <span className="text-[10px] text-amber-400/80">Tap to auto-fill</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BANGLADESH_DAILY_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleDailyPresetSelect(preset)}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition-all active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 truncate">{preset.label}</span>
                        <span className="text-xs font-black text-amber-400 font-mono">
                          {formatCurrency(preset.amount)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate mt-0.5">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount Field with Quick Taka Bumps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  {type === 'income' ? 'Income Amount' : isDailyRoutineEnabled ? 'Daily Rate' : 'Expense Amount'}
                </label>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {amount ? formatCurrency(parseFloat(amount) || 0) : `${profile.currencySymbol || 'Tk'}0`}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">
                  {profile.currencySymbol || 'Tk'}
                </span>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (isDailyRoutineEnabled) setDailyRateInput(e.target.value);
                  }}
                  placeholder="0.00"
                  required
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-2xl font-black text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              {/* Quick Taka Chip Bumps */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(type === 'income' ? [500, 1000, 2000, 5000, 10000, 25000] : [20, 50, 100, 200, 500, 1000, 2000]).map((bump) => (
                  <button
                    key={bump}
                    type="button"
                    onClick={() => handleAmountBump(bump)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer font-mono"
                  >
                    +{formatCurrency(bump)}
                  </button>
                ))}
              </div>
            </div>

            {/*  USER REQUEST CORE: DAILY ROUTINE & MONTHLY CALCULATION WITH OFF-DAYS */}
            {type === 'expense' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Daily Routine & Monthly Auto-Calculation
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Calculate monthly bill by multiplying daily rate with active days (minus off/missed days).
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDailyRoutineEnabled}
                      onChange={(e) => {
                        setIsDailyRoutineEnabled(e.target.checked);
                        if (e.target.checked && !dailyRateInput) {
                          setDailyRateInput(amount || '150');
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {isDailyRoutineEnabled && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-in fade-in duration-200">
                    {/* Controls Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Total Days in Month */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">
                          Total Days in Month
                        </label>
                        <select
                          value={totalMonthDays}
                          onChange={(e) => setTotalMonthDays(parseInt(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value={30}>30 Days (Standard Month)</option>
                          <option value={31}>31 Days (Full Month)</option>
                          <option value={28}>28 Days (February)</option>
                          <option value={26}>26 Working Days (No Fri/Sat)</option>
                          <option value={22}>22 Official Work Days</option>
                        </select>
                      </div>

                      {/* Off-Days / Missed Days */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <label className="text-[10px] font-bold text-amber-400 block mb-1">
                          Off / Missed Days
                        </label>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setOffDaysCount(Math.max(0, offDaysCount - 1))}
                            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={offDaysCount}
                            onChange={(e) => setOffDaysCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center font-bold text-amber-300 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setOffDaysCount(offDaysCount + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Reason for Off Days */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">
                          Off-Day Reason
                        </label>
                        <input
                          type="text"
                          value={offDaysReason}
                          onChange={(e) => setOffDaysReason(e.target.value)}
                          placeholder="e.g., Went Home / Roza / Sick"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Interactive Calculation Breakdown Ribbon */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-400 font-mono">
                          ({calculatedRoutine.days} Days - {calculatedRoutine.off} Off)
                        </span>
                        <span className="text-slate-500">=</span>
                        <span className="text-emerald-400 font-black font-mono">
                          {calculatedRoutine.activeDays} Active Days
                        </span>
                        <span className="text-slate-500">×</span>
                        <span className="text-amber-400 font-bold font-mono">
                          {formatCurrency(calculatedRoutine.rate)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 mr-2">Projected Month Total:</span>
                        <span className="text-sm font-black text-amber-300 font-mono">
                          {formatCurrency(calculatedRoutine.monthlyTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox: Save Full Monthly Calculated Routine vs Single Today Log */}
                    <label className="flex items-center space-x-2 cursor-pointer bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <input
                        type="checkbox"
                        checked={saveAsRoutineMonthlyTotal}
                        onChange={(e) => setSaveAsRoutineMonthlyTotal(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300">
                        Commit full calculated monthly total (<strong>{formatCurrency(calculatedRoutine.monthlyTotal)}</strong>) as a monthly recurring bill
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Category / Stream Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                {type === 'income' ? 'Income Stream' : 'Expense Sector'}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(type === 'income' ? DEFAULT_INCOME_SOURCES : DEFAULT_EXPENSE_CATEGORIES).map((catName) => {
                  const details =
                    type === 'income'
                      ? INCOME_SOURCE_DETAILS[catName] || { icon: <DollarSign className="w-4 h-4" />, label: catName, desc: '' }
                      : EXPENSE_SECTOR_DETAILS[catName] || { icon: <DollarSign className="w-4 h-4" />, label: catName, desc: '' };

                  const isSelected = category === catName;

                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => setCategory(catName)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                        isSelected
                          ? type === 'income'
                            ? 'bg-emerald-500/20 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                            : 'bg-rose-500/20 border-rose-500/50 shadow-sm ring-1 ring-rose-500/30'
                          : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{details.icon}</div>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {details.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">{details.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description & Payer/Client Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'income' ? 'e.g. Upwork Client Milestone / Tech Salary' : 'e.g. Mess Meal, Rickshaw, Grocery'}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {type === 'income' ? 'Payer / Client / Institution' : 'Merchant / Store / Person'}
                </label>
                <input
                  type="text"
                  value={payerOrClient}
                  onChange={(e) => setPayerOrClient(e.target.value)}
                  placeholder={type === 'income' ? 'e.g. Brain Station 23 / RUET CSE' : 'e.g. Shwapno, Mess Manager, Rickshaw'}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Method / Way of Dealing & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center justify-between">
                  <span>Payment Method</span>
                  <span className="text-[10px] text-pink-400 font-bold">bKash • Nagad • Rocket</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Recurring Schedule */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Recurring Frequency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'none', label: 'One-time' },
                  { key: 'weekly', label: 'Weekly' },
                  { key: 'monthly', label: 'Monthly' },
                  { key: 'yearly', label: 'Yearly' },
                ].map((rec) => (
                  <button
                    key={rec.key}
                    type="button"
                    onClick={() => setRecurring(rec.key as any)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      recurring === rec.key
                        ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rec.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags & Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Tags & Reference Notes
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag (e.g. Mess, RUET, Client) and hit enter"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Add Tag
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono flex items-center gap-1 border border-slate-700"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-400 cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3 sticky bottom-0 bg-slate-900 py-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5 ${
                  type === 'income'
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 text-white shadow-rose-500/25'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {editingTransaction
                    ? 'Save Changes'
                    : type === 'income'
                    ? `Deposit Income (${amount ? formatCurrency(parseFloat(amount)) : 'Tk0'})`
                    : isDailyRoutineEnabled && saveAsRoutineMonthlyTotal
                    ? `Save Monthly Routine (${formatCurrency(calculatedRoutine.monthlyTotal)})`
                    : `Log Expense (${amount ? formatCurrency(parseFloat(amount)) : 'Tk0'})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
