import React, { useState } from 'react';
import { CategoryId } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { Info, ChevronDown } from 'lucide-react';

interface LegendProps {
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
  seatCounts: Record<CategoryId, number>;
}

const LEGEND_ITEMS: CategoryId[] = [
  'vip',
  'senior_faculty',
  'faculty',
  'awardees',
  'reporters',
  'accompanying',
  'console',
  'band_party',
  'audience',
  'blocked',
];

export const Legend: React.FC<LegendProps> = ({
  selectedCategory,
  onSelectCategory,
  seatCounts,
}) => {
  // Collapsible, because at full size it covers a good part of the floor plan.
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-300 shadow-xl text-xs overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider text-[11px] cursor-pointer hover:text-blue-700 transition"
        >
          <Info className="w-3.5 h-3.5 text-blue-600" />
          Zone colours
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>

        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer whitespace-nowrap"
          >
            Show all
          </button>
        )}
      </div>

      {open && (
        <div className="px-2.5 pb-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {LEGEND_ITEMS.map((catId) => {
            const cat = CATEGORIES[catId];
            const isSelected = selectedCategory === catId;

            return (
              <button
                key={catId}
                onClick={() => onSelectCategory(isSelected ? 'all' : catId)}
                title={`Show only ${cat.name}`}
                className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border cursor-pointer transition-all text-left ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded border shrink-0"
                    style={{ backgroundColor: cat.color, borderColor: cat.borderColor }}
                  />
                  <span className="text-[11px] font-semibold text-slate-800 truncate">{cat.shortName}</span>
                </span>
                <span className="font-mono text-[10px] font-bold text-slate-600 shrink-0">
                  {seatCounts[catId] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
