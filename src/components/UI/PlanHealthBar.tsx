import React from 'react';
import { AlertTriangle, CheckCircle2, Wand2, Users } from 'lucide-react';
import { PlanIssue } from '../../utils/autoSeat';

interface PlanHealthBarProps {
  issues: PlanIssue[];
  unassignedCount: number;
  onAutoSeat: () => void;
  onOpenRoster: () => void;
}

/**
 * A single honest line about whether the plan is ready, with the one button
 * that usually fixes it. Sits above the map so problems are noticed before
 * anything gets printed.
 */
export const PlanHealthBar: React.FC<PlanHealthBarProps> = ({
  issues,
  unassignedCount,
  onAutoSeat,
  onOpenRoster,
}) => {
  if (issues.length === 0) {
    return (
      <div className="no-print bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Everyone on the roster has a seat in the right zone. This plan is ready to print.</span>
      </div>
    );
  }

  return (
    <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-amber-950">
      <span className="flex items-center gap-1.5 font-bold shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        Needs attention:
      </span>

      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
        {issues.map((issue, i) => (
          <span key={`${issue.kind}-${i}`} className="after:content-['•'] after:ml-2 after:text-amber-400 last:after:content-['']">
            {issue.message}
          </span>
        ))}
      </span>

      <span className="flex items-center gap-2 ml-auto shrink-0">
        {unassignedCount > 0 && (
          <button
            onClick={onAutoSeat}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Auto-seat {unassignedCount} guest{unassignedCount === 1 ? '' : 's'}
          </button>
        )}
        <button
          onClick={onOpenRoster}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer"
        >
          <Users className="w-3.5 h-3.5" />
          Open roster
        </button>
      </span>
    </div>
  );
};
