import React from 'react';
import { Seat, CategoryId, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { Settings, Plus } from 'lucide-react';

interface StatsBarProps {
  seats: Seat[];
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
  categories?: Record<string, CategoryInfo>;
  onOpenSectionManager?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  seats,
  selectedCategory,
  onSelectCategory,
  categories = CATEGORIES,
  onOpenSectionManager,
}) => {
  const categoryCounts = seats.reduce((acc, seat) => {
    acc[seat.categoryId] = (acc[seat.categoryId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryIcons: Record<string, string> = {
    vip: '👑',
    faculty: '🎓',
    senior_faculty: '⭐',
    awardees: '🏆',
    reporters: '🎤',
    accompanying: '👨‍👩‍👧',
    band_party: '🎵',
    audience: '👥',
    blocked: '🚫',
    guide: '🧭',
    mbbs: '🩺',
    nursing: '💉',
    pg: '📋',
    it_staff: '🖥️',
    admin_staff: '📂',
  };

  const catList = Object.values(categories).filter((c) => c.id !== 'available');

  return (
    <div className="no-print bg-slate-100/80 border-b border-slate-200 py-2 px-4 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max">
        <span className="text-[11px] font-bold text-slate-500 mr-1 uppercase tracking-wider flex items-center gap-1">
          <span>Filter Zone:</span>
        </span>

        {/* All Seats Filter */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white border-slate-900 scale-[1.02]'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
          }`}
        >
          <span>🏛️ All Seats</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-800 font-mono">
            {seats.length}
          </span>
        </button>

        {/* Specific Category Chips */}
        {catList.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          const isSelected = selectedCategory === cat.id;
          const icon = categoryIcons[cat.id] || '🏷️';

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                isSelected
                  ? 'ring-2 ring-slate-900 scale-105 font-black'
                  : 'hover:opacity-90 opacity-95'
              }`}
              style={{
                backgroundColor: cat.color,
                color: cat.textColor,
                borderColor: cat.borderColor,
              }}
            >
              <span>{icon} {cat.shortName}</span>
              <span
                className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.12)',
                  color: cat.textColor,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Manage / Add Sections Button */}
        {onOpenSectionManager && (
          <button
            type="button"
            onClick={onOpenSectionManager}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs transition cursor-pointer ml-1"
            title="Add, Edit or Delete Seating Sections"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage Sections</span>
          </button>
        )}
      </div>
    </div>
  );
};
