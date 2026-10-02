import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Cross-browser month picker that replaces unreliable <input type="month">.
 * Works in Firefox, Safari, Chrome, Edge — no native date picker dependency.
 */
export const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseInt(value.split('-')[0]) || new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync viewYear when value changes externally
  useEffect(() => {
    const y = parseInt(value.split('-')[0]);
    if (!isNaN(y)) setViewYear(y);
  }, [value]);

  const selectedMonth = parseInt(value.split('-')[1]) - 1; // 0-indexed
  const selectedYear = parseInt(value.split('-')[0]);

  const handleSelect = (monthIndex: number) => {
    const m = String(monthIndex + 1).padStart(2, '0');
    onChange(`${viewYear}-${m}`);
    setOpen(false);
  };

  const displayLabel = (() => {
    const m = parseInt(value.split('-')[1]) - 1;
    const y = parseInt(value.split('-')[0]);
    if (isNaN(m) || isNaN(y)) return 'Select Month';
    return `${FULL_MONTH_NAMES[m]} ${y}`;
  })();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-colors cursor-pointer min-w-[160px]"
      >
        <Calendar className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold text-slate-200 flex-1 text-left">{displayLabel}</span>
        <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-[260px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Year Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-white tracking-wide">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, i) => {
              const isSelected = viewYear === selectedYear && i === selectedMonth;
              const isCurrent = viewYear === new Date().getFullYear() && i === new Date().getMonth();
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(i)}
                  className={`
                    py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer
                    ${isSelected
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : isCurrent
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }
                  `}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                onChange(`${now.getFullYear()}-${m}`);
                setOpen(false);
              }}
              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider cursor-pointer"
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
