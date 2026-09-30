import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Smartphone,
  Building2,
  Wallet,
  ArrowDownRight,
  Trash2,
  Zap,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../data/defaultData';
import { ExpenseCategory, PaymentMethod } from '../types';

interface ParsedTransaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  category: ExpenseCategory;
  source: 'bKash' | 'Nagad' | 'Bank' | 'Other';
}

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Auto-detect payment method from text
const detectSource = (text: string): 'bKash' | 'Nagad' | 'Bank' | 'Other' => {
  const lower = text.toLowerCase();
  if (lower.includes('bkash') || lower.includes('b-kash')) return 'bKash';
  if (lower.includes('nagad')) return 'Nagad';
  if (lower.includes('bank') || lower.includes('a/c') || lower.includes('account') || lower.includes('debit')) return 'Bank';
  return 'Other';
};

// Auto-categorize based on keywords
const detectCategory = (desc: string): ExpenseCategory => {
  const lower = desc.toLowerCase();
  if (/food|meal|lunch|dinner|breakfast|restaurant|hotel|cafe|coffee|snack|mess/.test(lower)) return 'Food & Dining';
  if (/rent|house|flat|apartment|hostel|mess seat/.test(lower)) return 'Housing & Rent';
  if (/grocery|bazaar|supermarket|shop|market/.test(lower)) return 'Household & Living';
  if (/electric|gas|water|wifi|internet|bill|mobile|recharge/.test(lower)) return 'Utilities & Bills';
  if (/bus|rickshaw|uber|transport|fuel|metro|train|fare/.test(lower)) return 'Transportation';
  if (/tuition|book|course|exam|university|college|study/.test(lower)) return 'Education';
  if (/cloth|dress|shoe|bag|electronics|gadget/.test(lower)) return 'Shopping';
  if (/movie|cinema|game|entertainment|concert|trip/.test(lower)) return 'Entertainment';
  if (/doctor|medicine|hospital|pharmacy|medical/.test(lower)) return 'Healthcare & Medical';
  if (/salon|parlour|beauty|gym/.test(lower)) return 'Personal Care';
  if (/travel|ticket|flight|hotel booking/.test(lower)) return 'Travel';
  return 'Other';
};

// Parse amount from text (handles Tk, BDT, Tk, and plain numbers)
const parseAmount = (text: string): number => {
  // Match patterns like "Tk. 500", "Tk 500.00", "BDT 1,234", "Tk500", "500.00"
  const patterns = [
    /(?:tk\.?|bdt|Tk)\s*([\d,]+\.?\d*)/i,
    /([\d,]+\.?\d*)\s*(?:tk|taka|bdt|Tk)/i,
    /(?:amount|amt|sent|paid|debited|received)\s*(?:of|:)?\s*(?:tk\.?|bdt|Tk)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) return amount;
    }
  }

  // Fallback: find any standalone number > 0
  const numMatch = text.match(/([\d,]+\.?\d*)/);
  if (numMatch) {
    const amount = parseFloat(numMatch[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) return amount;
  }

  return 0;
};

// Parse date from text
const parseDate = (text: string): string => {
  const today = new Date().toISOString().split('T')[0];

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const ymd = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return ymd[0];

  return today;
};

// Parse a single line/block into a transaction
const parseLine = (line: string, index: number): ParsedTransaction | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 10) return null;

  const amount = parseAmount(trimmed);
  if (amount <= 0) return null;

  const source = detectSource(trimmed);
  const date = parseDate(trimmed);
  const category = detectCategory(trimmed);

  // Build description from the line (truncate if too long)
  let description = trimmed;
  if (description.length > 80) {
    description = description.substring(0, 77) + '...';
  }

  const paymentMethod: PaymentMethod =
    source === 'bKash' ? 'bKash' :
    source === 'Nagad' ? 'Nagad' :
    source === 'Bank' ? 'Bank Transfer' : 'Cash';

  return {
    id: `parsed_${Date.now()}_${index}`,
    amount,
    description,
    date,
    paymentMethod,
    category,
    source,
  };
};

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose }) => {
  const { addTransaction, addMultipleTransactions, formatCurrency } = useFinance();
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [imported, setImported] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    setIsParsing(true);
    setImported(false);

    // Split by newlines or common delimiters
    const lines = rawText
      .split(/[\n;]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    const results: ParsedTransaction[] = [];
    lines.forEach((line, i) => {
      const parsed_tx = parseLine(line, i);
      if (parsed_tx) results.push(parsed_tx);
    });

    setParsed(results);
    setIsParsing(false);
  };

  const handleImportAll = () => {
    if (parsed.length === 0) return;

    const txs = parsed.map((p) => ({
      type: 'expense' as const,
      amount: p.amount,
      category: p.category,
      description: p.description,
      date: p.date,
      paymentMethod: p.paymentMethod,
      tags: [p.source, 'Smart Import'],
    }));

    addMultipleTransactions(txs);
    setImported(true);
    setTimeout(() => {
      onClose();
      setRawText('');
      setParsed([]);
      setImported(false);
    }, 1500);
  };

  const removeParsed = (id: string) => {
    setParsed((prev) => prev.filter((p) => p.id !== id));
  };

  const updateParsedCategory = (id: string, cat: ExpenseCategory) => {
    setParsed((prev) => prev.map((p) => (p.id === id ? { ...p, category: cat } : p)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Smart Import — Bank / bKash / Nagad</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Instructions */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200">
            <strong>How it works:</strong> Paste your bKash, Nagad, or Bank SMS/notification text below.
            The system auto-detects amount, date, payment method & category. Then click "Import All" to add as expenses.
          </div>

          {/* Input Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Paste Transaction Text (SMS, notification, or statement)
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              placeholder={`e.g.\nYou have sent Tk. 500 to 01712345678 on 08/09/2026. Fee: Tk. 5. Balance: Tk. 1,234. TrxID: ABC123\nNagad: Tk. 1,200 sent to 01898765432 on 07-09-2026. Balance: Tk. 5,000\nYour a/c 1234 has been debited BDT 2,500.00 on 06/09/2026 for grocery payment.`}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y font-mono"
            />
          </div>

          {/* Parse Button */}
          <button
            onClick={handleParse}
            disabled={!rawText.trim() || isParsing}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isParsing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Parse Transactions</>
            )}
          </button>

          {/* Parsed Results */}
          {parsed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Parsed Transactions ({parsed.length})</h3>
                <button
                  onClick={handleImportAll}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Import All ({parsed.length})
                </button>
              </div>

              {parsed.map((tx) => (
                <div key={tx.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tx.source === 'bKash' && <Smartphone className="w-4 h-4 text-pink-400" />}
                      {tx.source === 'Nagad' && <Smartphone className="w-4 h-4 text-orange-400" />}
                      {tx.source === 'Bank' && <Building2 className="w-4 h-4 text-blue-400" />}
                      {tx.source === 'Other' && <Wallet className="w-4 h-4 text-slate-400" />}
                      <span className="text-sm font-bold text-white">{formatCurrency(tx.amount)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">{tx.source}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">{tx.paymentMethod}</span>
                    </div>
                    <button onClick={() => removeParsed(tx.id)} className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1">{tx.description}</p>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-slate-500">{tx.date}</span>
                    <select
                      value={tx.category}
                      onChange={(e) => updateParsedCategory(tx.id, e.target.value as ExpenseCategory)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Success Message */}
          {imported && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> All transactions imported successfully!
            </div>
          )}

          {/* Empty state after parse */}
          {parsed.length === 0 && rawText.trim() && !isParsing && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4" /> No valid transactions detected. Make sure the text contains an amount (e.g. "Tk. 500" or "BDT 1,200").
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
