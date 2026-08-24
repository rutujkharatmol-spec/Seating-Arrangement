import React from 'react';
import { Seat, CategoryId } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { ShieldCheck, UserCheck, Armchair, Ban, Users } from 'lucide-react';

interface StatsBarProps {
  seats: Seat[];
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  seats,
  selectedCategory,
  onSelectCategory,
}) => {
  const total = seats.length; // 750

  const counts: Record<CategoryId, number> = {
    vip: 0,
    senior_faculty: 0,
    faculty: 0,
    awardees: 0,
    reporters: 0,
    accompanying: 0,
    band_party: 0,
    console: 0,
    audience: 0,
    blocked: 0,
    available: 0,
  };

  let assignedCount = 0;
  let blockedCount = 0;

  seats.forEach((s) => {
    if (counts[s.categoryId] !== undefined) {
      counts[s.categoryId]++;
    }
    if (s.attendee || s.attendeeId) assignedCount++;
    if (s.isBlocked || s.categoryId === 'blocked') blockedCount++;
  });

  const categoriesList: CategoryId[] = [
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

  return (
    <div className="no-print bg-white/90 border-b border-slate-200 px-4 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* Quick summary chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-bold">
            <Armchair className="w-3.5 h-3.5 text-blue-600" />
            <span>Total Seats: <strong>{total}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Assigned: <strong>{assignedCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-semibold">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Reserved: <strong>{total - assignedCount - blockedCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 font-semibold">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            <span>Blocked: <strong>{blockedCount}</strong></span>
          </div>
        </div>

        {/* Category breakdown clickable pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-thin">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-blue-500'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Zones ({total})
          </button>

          {categoriesList.map((catId) => {
            const cat = CATEGORIES[catId];
            const isSelected = selectedCategory === catId;
            const count = counts[catId] || 0;

            return (
              <button
                key={catId}
                onClick={() => onSelectCategory(isSelected ? 'all' : catId)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all border shadow-2xs ${
                  isSelected
                    ? 'ring-2 ring-slate-900 shadow-md scale-105 font-bold text-slate-950'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
                style={{
                  backgroundColor: isSelected ? cat.color : '#f8fafc',
                  borderColor: isSelected ? '#0f172a' : cat.borderColor,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block border border-slate-400/40"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.shortName}</span>
                <span className="font-mono text-[11px] font-bold text-slate-600">({count})</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
