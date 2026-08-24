import React from 'react';
import { Search, X, Shield, DoorOpen, CornerDownLeft } from 'lucide-react';
import { TierType } from '../../types/seating';

export interface SearchFilterBarProps {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onJumpToFirstMatch?: () => void;
  selectedTier: TierType | 'ALL';
  setSelectedTier: (tier: TierType | 'ALL') => void;
  showVolunteers: boolean;
  setShowVolunteers: (show: boolean) => void;
  showAisles: boolean;
  setShowAisles: (show: boolean) => void;
  highlightedCount: number;
  lowerCount?: number;
  upperCount?: number;
  totalCount?: number;
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
  lowerCount = 631,
  upperCount = 132,
  totalCount = 763,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onJumpToFirstMatch && highlightedCount > 0) {
      e.preventDefault();
      onJumpToFirstMatch();
    }
  };

  return (
    <div className="no-print bg-white border-b border-slate-200 px-4 py-3 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Big Search Input */}
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-blue-600" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="🔎 Search by Guest Name, Role, Department or Seat Code (e.g. C-A7, Dean, Director)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-24 py-2 text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition shadow-2xs"
          />

          {searchQuery ? (
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {highlightedCount} found
              </span>
              {onJumpToFirstMatch && highlightedCount > 0 && (
                <button
                  type="button"
                  onClick={onJumpToFirstMatch}
                  title="Jump to first match on map (Enter)"
                  className="p-1 rounded-md text-slate-500 hover:text-blue-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <CornerDownLeft className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-slate-400">
              Press /
            </span>
          )}
        </div>

        {/* Floor Filter Tabs & Display Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Floor Level Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedTier('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedTier === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Floors ({totalCount})
            </button>
            <button
              onClick={() => setSelectedTier('LOWER')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedTier === 'LOWER'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ground Floor ({lowerCount})
            </button>
            <button
              onClick={() => setSelectedTier('UPPER')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedTier === 'UPPER'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Balcony ({upperCount})
            </button>
          </div>

          {/* Volunteer Toggle */}
          <button
            onClick={() => setShowVolunteers(!showVolunteers)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-2xs ${
              showVolunteers
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Volunteers</span>
          </button>

          {/* Door / Gate Labels Toggle */}
          <button
            onClick={() => setShowAisles(!showAisles)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-2xs ${
              showAisles
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Gate Arrows</span>
          </button>

        </div>

      </div>
    </div>
  );
};
