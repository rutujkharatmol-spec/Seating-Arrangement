import React, { useMemo, useState } from 'react';
import { Seat, Volunteer, CategoryId, QuestionnaireAnswers, Attendee } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { QuestionnaireWizard } from './QuestionnaireWizard';
import { SeatInspector } from './SeatInspector';
import { VolunteerEditor } from './VolunteerEditor';
import { Sparkles, Shield, Armchair, Keyboard } from 'lucide-react';

interface EditorTabProps {
  answers: QuestionnaireAnswers;
  onApplyAnswers: (answers: QuestionnaireAnswers) => void;
  seats: Seat[];
  selectedSeats: Seat[];
  unassignedAttendees: Attendee[];
  onUpdateSeatsCategory: (seatIds: string[], categoryId: CategoryId) => void;
  onSaveAttendee: (seatId: string, attendee: Partial<Attendee>) => void;
  onAssignExistingAttendee: (seatId: string, attendeeId: string) => void;
  onClearSeat: (seatId: string) => void;
  onToggleBlockedSeats: (seatIds: string[], isBlocked: boolean) => void;
  onClearSelection: () => void;
  onSelectRow: (seat: Seat) => void;
  onSelectZone: (seat: Seat) => void;
  volunteers: Volunteer[];
  onAddVolunteer: (vol: Volunteer) => void;
  onUpdateVolunteer: (vol: Volunteer) => void;
  onDeleteVolunteer: (id: string) => void;
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl + Z', 'Undo the last change'],
  ['Ctrl + Shift + Z', 'Redo'],
  ['Shift + drag', 'Select a block of seats on the map'],
  ['Click a seat', 'Open it in the editing panel'],
  ['/', 'Jump to the search box'],
  ['Enter (in search)', 'Zoom the map to the first match'],
  ['Esc', 'Clear the current selection'],
];

export const EditorTab: React.FC<EditorTabProps> = ({
  answers,
  onApplyAnswers,
  seats,
  selectedSeats,
  unassignedAttendees,
  onUpdateSeatsCategory,
  onSaveAttendee,
  onAssignExistingAttendee,
  onClearSeat,
  onToggleBlockedSeats,
  onClearSelection,
  onSelectRow,
  onSelectZone,
  volunteers,
  onAddVolunteer,
  onUpdateVolunteer,
  onDeleteVolunteer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'wizard' | 'seats' | 'volunteers'>('wizard');

  /** A live breakdown of the layout, so the blueprint text can never go stale. */
  const blockSummary = useMemo(() => {
    const byBlock = new Map<string, { total: number; zones: Map<CategoryId, number> }>();

    seats.forEach((s) => {
      const entry = byBlock.get(s.blockName) ?? { total: 0, zones: new Map<CategoryId, number>() };
      entry.total += 1;
      entry.zones.set(s.categoryId, (entry.zones.get(s.categoryId) ?? 0) + 1);
      byBlock.set(s.blockName, entry);
    });

    return Array.from(byBlock.entries()).map(([blockName, entry]) => ({
      blockName,
      total: entry.total,
      zones: Array.from(entry.zones.entries()).sort((a, b) => b[1] - a[1]),
    }));
  }, [seats]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Setup & configuration</h2>
          <p className="text-xs text-slate-500">
            Answer a few questions to lay out the zones, fine-tune individual seats, or place your volunteers.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveSubTab('wizard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'wizard' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup wizard</span>
          </button>

          <button
            onClick={() => setActiveSubTab('seats')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'seats' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Armchair className="w-3.5 h-3.5" />
            <span>Seat editor {selectedSeats.length > 0 && `(${selectedSeats.length})`}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('volunteers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'volunteers' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Volunteers ({volunteers.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'wizard' && (
        <QuestionnaireWizard answers={answers} onApplyAnswers={onApplyAnswers} />
      )}

      {activeSubTab === 'seats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2">
            <SeatInspector
              selectedSeats={selectedSeats}
              unassignedAttendees={unassignedAttendees}
              onUpdateSeatsCategory={onUpdateSeatsCategory}
              onSaveAttendee={onSaveAttendee}
              onAssignExistingAttendee={onAssignExistingAttendee}
              onClearSeat={onClearSeat}
              onToggleBlockedSeats={onToggleBlockedSeats}
              onClearSelection={onClearSelection}
              onSelectRow={onSelectRow}
              onSelectZone={onSelectZone}
            />
          </div>

          <div className="space-y-4">
            {/* What the auditorium currently looks like, counted from the data */}
            <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
                How the {seats.length} seats are split up
              </h3>

              {blockSummary.map((block) => (
                <div key={block.blockName} className="text-xs">
                  <p className="font-bold text-slate-900">
                    {block.blockName}{' '}
                    <span className="font-mono text-slate-500 font-semibold">({block.total})</span>
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {block.zones.map(([catId, count]) => (
                      <li key={catId} className="flex items-center gap-2 text-slate-600">
                        <span
                          className="w-2.5 h-2.5 rounded-sm border shrink-0"
                          style={{
                            backgroundColor: CATEGORIES[catId]?.color,
                            borderColor: CATEGORIES[catId]?.borderColor,
                          }}
                        />
                        <span className="flex-1 truncate">{CATEGORIES[catId]?.name ?? catId}</span>
                        <span className="font-mono font-bold text-slate-700">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xl space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
                <Keyboard className="w-4 h-4 text-blue-600" />
                <span>Handy shortcuts</span>
              </h3>
              <dl className="space-y-1.5 text-xs">
                {SHORTCUTS.map(([keys, what]) => (
                  <div key={keys} className="flex items-baseline justify-between gap-3">
                    <dt>
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-800 whitespace-nowrap">
                        {keys}
                      </kbd>
                    </dt>
                    <dd className="text-slate-600 text-right">{what}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'volunteers' && (
        <div className="max-w-2xl mx-auto">
          <VolunteerEditor
            volunteers={volunteers}
            onAddVolunteer={onAddVolunteer}
            onUpdateVolunteer={onUpdateVolunteer}
            onDeleteVolunteer={onDeleteVolunteer}
          />
        </div>
      )}

    </div>
  );
};
