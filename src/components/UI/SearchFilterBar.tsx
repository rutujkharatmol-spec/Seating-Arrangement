import React from 'react';
import { Search, X, Navigation, Layers, CornerDownLeft } from 'lucide-react';
import { TierType } from '../../types/seating';

interface SearchFilterBarProps {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Enter jumps the map to the first matching seat. */
  onJumpToFirstMatch: () => void;
  selectedTier: TierType | 'ALL';
  setSelectedTier: (tier: TierType | 'ALL') => void;
  showVolunteers: boolean;
  setShowVolunteers: (show: boolean) => void;
  showAisles: boolean;
  setShowAisles: (show: boolean) => void;
  highlightedCount: number;
  lowerCount: number;
  upperCount: number;
  totalCount: number;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchInputRef,
  searchQuery,
  setSearchQuery,
  onJumpToFirstMatch,
  selectedTier,
  setSelectedTier,
  showVolunteers,
  setShowVolunteers,
  showAisles,
  setShowAisles,
  highlightedCount,
  lowerCount,
  upperCount,
  totalCount,
}) => {
  const tiers: { id: TierType | 'ALL'; label: string; count: number }[] = [
    { id: 'ALL', label: 'All tiers', count: totalCount },
    { id: 'LOWER', label: 'Ground floor', count: lowerCount },
    { id: 'UPPER', label: 'Balcony', count: upperCount },
  ];

  return (
    <div className="no-print bg-slate-100/90 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">

      {/* Search */}
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onJumpToFirstMatch();
            if (e.key === 'Escape') setSearchQuery('');
          }}
          placeholder="Find a guest or a seat — try a name, C-A7, or 'Cardiology'   ( / )"
          className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {searchQuery && (
          <span
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
              highlightedCount > 0
                ? 'bg-blue-100 text-blue-900 border-blue-300'
                : 'bg-slate-200 text-slate-600 border-slate-300'
            }`}
          >
            {highlightedCount > 0 ? (
              <>
                {highlightedCount} found
                <CornerDownLeft className="w-3 h-3" />
                <span className="font-sans font-semibold">Enter to jump</span>
              </>
            ) : (
              'No match'
            )}
          </span>
        )}

        {/* Tier filter */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`px-2.5 py-1 rounded-md transition text-xs font-semibold cursor-pointer ${
                selectedTier === tier.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {tier.label} ({tier.count})
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowVolunteers(!showVolunteers)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition text-xs font-semibold cursor-pointer ${
            showVolunteers
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-xs'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
          title="Show or hide volunteer checkpoints on the map"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Volunteers</span>
        </button>

        <button
          onClick={() => setShowAisles(!showAisles)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition text-xs font-semibold cursor-pointer ${
            showAisles
              ? 'bg-indigo-100 border-indigo-300 text-indigo-900 shadow-xs'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
          title="Show or hide the zone outlines and their labels"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zone labels</span>
        </button>
      </div>

    </div>
  );
};
