import React, { useState } from 'react';
import { CategoryId, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { Info, ChevronDown, Settings } from 'lucide-react';

interface LegendProps {
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
  seatCounts: Record<CategoryId, number>;
  categories?: Record<string, CategoryInfo>;
  onOpenSectionManager?: () => void;
}

export const Legend: React.FC<LegendProps> = ({
  selectedCategory,
  onSelectCategory,
  seatCounts,
  categories = CATEGORIES,
  onOpenSectionManager,
}) => {
  const [open, setOpen] = useState(true);

  const catList = Object.values(categories).filter((c) => c.id !== 'available');

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300 shadow-xl text-xs overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider text-[11px] cursor-pointer hover:text-blue-700 transition"
        >
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>Zone Colours</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>

        <div className="flex items-center gap-2">
          {onOpenSectionManager && (
            <button
              onClick={onOpenSectionManager}
              title="Add, Edit or Delete Sections"
              className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Edit Sections</span>
            </button>
          )}

          {selectedCategory !== 'all' && (
            <button
              onClick={() => onSelectCategory('all')}
              className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer whitespace-nowrap"
            >
              Show all
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-60 overflow-y-auto scrollbar-thin">
          {catList.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
                title={`Show only ${cat.name}`}
                className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border cursor-pointer transition-all text-left ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600/30 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded border shrink-0"
                    style={{ backgroundColor: cat.color, borderColor: cat.borderColor }}
                  />
                  <span className="text-[11px] font-bold text-slate-800 truncate">{cat.shortName}</span>
                </span>
                <span className="font-mono text-[10px] font-bold text-slate-600 shrink-0">
                  {seatCounts[cat.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
