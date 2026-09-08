import React, { useState, useMemo, useEffect } from 'react';
import { Attendee, Seat, CategoryId, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import {
  extractUniqueDesignations,
  assignSeatsByDesignationOrder,
  DesignationGroupInfo,
} from '../../utils/designationHierarchy';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import {
  X,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Armchair,
  Layers,
  ArrowDownUp,
  RotateCcw,
} from 'lucide-react';

interface AutoSeatByDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: Attendee[];
  seats: Seat[];
  categories?: Record<string, CategoryInfo>;
  onApplySeating: (updatedAttendees: Attendee[], summaryMsg: string) => void;
  initialTargetCategory?: string;
}

export const AutoSeatByDesignationModal: React.FC<AutoSeatByDesignationModalProps> = ({
  isOpen,
  onClose,
  attendees,
  seats,
  categories = CATEGORIES,
  onApplySeating,
  initialTargetCategory = 'faculty',
}) => {
  const [targetCategory, setTargetCategory] = useState<string>(initialTargetCategory);
  const [withinSort, setWithinSort] = useState<'alphabetical' | 'department' | 'original'>('alphabetical');
  const [seatPattern, setSeatPattern] = useState<'sequential' | 'center_out'>('sequential');
  const [onlyUnseated, setOnlyUnseated] = useState<boolean>(false);

  // Filter relevant attendees for selected category
  const relevantAttendees = useMemo(() => {
    if (!targetCategory || targetCategory === 'ALL') return attendees;
    return attendees.filter((a) => a.categoryId === targetCategory);
  }, [attendees, targetCategory]);

  // Detected unique designations
  const detectedGroups = useMemo(() => {
    return extractUniqueDesignations(relevantAttendees);
  }, [relevantAttendees]);

  // User-ordered list of designations
  const [orderedDesignations, setOrderedDesignations] = useState<string[]>([]);

  // Synchronize detected designations when category changes
  useEffect(() => {
    setOrderedDesignations(detectedGroups.map((g) => g.designation));
  }, [detectedGroups]);

  useDismissOnEscape(isOpen, onClose);

  // Reorder handlers
  const moveUp = (index: number) => {
    if (index === 0) return;
    setOrderedDesignations((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === orderedDesignations.length - 1) return;
    setOrderedDesignations((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const moveToTop = (index: number) => {
    if (index === 0) return;
    setOrderedDesignations((prev) => {
      const item = prev[index];
      return [item, ...prev.filter((_, i) => i !== index)];
    });
  };

  const moveToBottom = (index: number) => {
    if (index === orderedDesignations.length - 1) return;
    setOrderedDesignations((prev) => {
      const item = prev[index];
      return [...prev.filter((_, i) => i !== index), item];
    });
  };

  const resetToDefault = () => {
    setOrderedDesignations(detectedGroups.map((g) => g.designation));
  };

  // Compute live preview allocation
  const previewResult = useMemo(() => {
    if (relevantAttendees.length === 0 || orderedDesignations.length === 0) return null;
    return assignSeatsByDesignationOrder({
      attendees: relevantAttendees,
      seats,
      designationPriority: orderedDesignations,
      withinSort,
      seatPattern,
      targetCategory: targetCategory === 'ALL' ? undefined : targetCategory,
      onlyUnseated,
    });
  }, [relevantAttendees, seats, orderedDesignations, withinSort, seatPattern, targetCategory, onlyUnseated]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!previewResult) return;

    // Merge seated relevant attendees back into global roster
    const updatedMap = new Map(previewResult.updatedAttendees.map((a) => [a.id, a]));
    const mergedAllAttendees = attendees.map((a) => {
      if (updatedMap.has(a.id)) {
        return updatedMap.get(a.id)!;
      }
      return a;
    });

    const summary = `Auto-seated ${previewResult.seatedCount} guests from Front to Back by designation rank!`;
    onApplySeating(mergedAllAttendees, summary);
    onClose();
  };

  // Available seats count in selected zone
  const availableSeatsCount = seats.filter(
    (s) => !s.isBlocked && (targetCategory === 'ALL' || s.categoryId === targetCategory)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/65 backdrop-blur-xs animate-fade-in text-slate-900"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 border border-blue-300">
              <GraduationCap className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Auto-Seat by Designation (Front to Back)</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Priority Rank
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Assign seats strictly from front rows to back rows based on academic or official designation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/70 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Controls Bar: Category & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Target Seating Category:</span>
              </label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Categories & Zones</option>
                {Object.values(categories).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({seats.filter((s) => s.categoryId === cat.id && !s.isBlocked).length} seats)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1">
                <Armchair className="w-3.5 h-3.5 text-emerald-600" />
                <span>Row Filling Pattern:</span>
              </label>
              <select
                value={seatPattern}
                onChange={(e) => setSeatPattern(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sequential">Left to Right (Seat 1, 2, 3...)</option>
                <option value="center_out">Center Outward (Center Aisle First)</option>
              </select>
            </div>

            <div>
              <label className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-1">
                <ArrowDownUp className="w-3.5 h-3.5 text-purple-600" />
                <span>Sort Within Each Designation:</span>
              </label>
              <select
                value={withinSort}
                onChange={(e) => setWithinSort(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="alphabetical">Alphabetical by Name (A to Z)</option>
                <option value="department">By Department</option>
                <option value="original">Original List Order</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-white border border-slate-200 rounded-lg w-full font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyUnseated}
                  onChange={(e) => setOnlyUnseated(e.target.checked)}
                  className="accent-blue-600 w-4 h-4 cursor-pointer"
                />
                <span>Only seat guests currently waiting (keep existing seats)</span>
              </label>
            </div>
          </div>

          {/* Designation Priority Order Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span>Front-to-Back Designation Priority Order:</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  #1 takes the front-most row (e.g. Row H). Use ⬆️ / ⬇️ to reorder who gets the front seats.
                </p>
              </div>

              <button
                type="button"
                onClick={resetToDefault}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer"
                title="Reset to default academic hierarchy"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Order</span>
              </button>
            </div>

            {orderedDesignations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                No attendees found for the selected category.
              </div>
            ) : (
              <div className="space-y-1.5">
                {orderedDesignations.map((desig, idx) => {
                  const group = detectedGroups.find((g) => g.designation === desig);
                  const count = group?.count ?? 0;
                  const isFirst = idx === 0;
                  const isLast = idx === orderedDesignations.length - 1;

                  return (
                    <div
                      key={desig}
                      className={`flex items-center justify-between p-3 rounded-xl border transition ${
                        isFirst
                          ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                            isFirst
                              ? 'bg-blue-600 text-white'
                              : idx === 1
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{desig}</span>
                            <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                              {count} {count === 1 ? 'guest' : 'guests'}
                            </span>
                            {isFirst && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-extrabold text-[9px] uppercase border border-amber-300">
                                Front Row #1
                              </span>
                            )}
                          </div>
                          {group?.sampleAttendees && group.sampleAttendees.length > 0 && (
                            <p className="text-[10px] text-slate-400 truncate max-w-sm sm:max-w-md mt-0.5">
                              e.g. {group.sampleAttendees.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveToTop(idx)}
                          disabled={isFirst}
                          title="Move to Front-most Rank"
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveUp(idx)}
                          disabled={isFirst}
                          title="Move Up"
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(idx)}
                          disabled={isLast}
                          title="Move Down"
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveToBottom(idx)}
                          disabled={isLast}
                          title="Move to Back-most Rank"
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Allocation Live Preview Summary Card */}
          {previewResult && previewResult.allocationSummary.length > 0 && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Seating Allocation Preview (Front to Back):</span>
                </span>
                <span className="font-bold text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  {previewResult.seatedCount} seated / {availableSeatsCount} seats in zone
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {previewResult.allocationSummary.map((item) => (
                  <div
                    key={item.designation}
                    className="p-2.5 bg-white border border-emerald-200 rounded-lg text-xs space-y-0.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 truncate max-w-[170px]">{item.designation}</span>
                      <span className="text-emerald-700 font-extrabold">{item.count} guests</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      📍 {item.rowSpan} ({item.firstSeat} → {item.lastSeat})
                    </div>
                  </div>
                ))}
              </div>

              {previewResult.unseatedCount > 0 && (
                <div className="text-rose-700 font-bold text-[11px] flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    Warning: {previewResult.unseatedCount} attendees exceed available seats in this category.
                  </span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!previewResult || previewResult.seatedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md shadow-blue-600/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Apply Front-to-Back Seating ({previewResult?.seatedCount || 0} Guests)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
