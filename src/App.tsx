import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Seat,
  Attendee,
  Volunteer,
  CategoryId,
  TierType,
  QuestionnaireAnswers,
  SeatingPreset,
} from './types/seating';
import { generateDefaultSeats } from './data/defaultSeatingData';
import { reallocateSeatsFromAnswers } from './utils/seatAlgorithms';
import { autoSeatAttendees, findPlanIssues } from './utils/autoSeat';
import { exportConfigurationJson, importConfigurationJson } from './utils/exportHelpers';
import {
  PlanState,
  createDefaultPlan,
  loadPlan,
  normalisePlan,
  savePlan,
  withAttendees,
} from './state/plan';
import { useHistory } from './hooks/useHistory';

import { Header } from './components/Header';
import { StatsBar } from './components/UI/StatsBar';
import { SearchFilterBar } from './components/UI/SearchFilterBar';
import { PlanHealthBar } from './components/UI/PlanHealthBar';
import { Toast, ToastKind } from './components/UI/Toast';
import { AuditoriumMap } from './components/AuditoriumMap/AuditoriumMap';
import { EditorTab } from './components/Editor/EditorTab';
import { QuestionnaireWizard } from './components/Editor/QuestionnaireWizard';
import { AttendeeList } from './components/AttendeeRoster/AttendeeList';
import { AddAttendeeModal } from './components/AttendeeRoster/AddAttendeeModal';
import { CsvImportExport } from './components/AttendeeRoster/CsvImportExport';
import { PrintLayoutModal } from './components/PrintAndExport/PrintLayoutModal';

type TabId = 'map' | 'editor' | 'roster' | 'print';

export function App() {
  const plan = useHistory<PlanState>(loadPlan);
  const { seats, attendees, volunteers, answers } = plan.present;

  // Navigation & view state (deliberately outside history — undo should never
  // move you to a different tab).
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<TierType | 'ALL'>('ALL');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [showAisles, setShowAisles] = useState(true);
  const [focusSeatId, setFocusSeatId] = useState<string | null>(null);

  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] = useState(false);
  const [isAddAttendeeModalOpen, setIsAddAttendeeModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 7000 : 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // ---------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------

  /** Seats joined with whoever is sitting in them. This is what the UI shows. */
  const seatsWithPeople = useMemo(() => withAttendees(seats, attendees), [seats, attendees]);

  const selectedSeats = useMemo(() => {
    if (selectedSeatIds.length === 0) return [];
    const wanted = new Set(selectedSeatIds);
    return seatsWithPeople.filter((s) => wanted.has(s.id));
  }, [seatsWithPeople, selectedSeatIds]);

  const unassignedAttendees = useMemo(() => attendees.filter((a) => !a.seatId), [attendees]);

  const planIssues = useMemo(() => findPlanIssues(seats, attendees), [seats, attendees]);

  const matchingSeatIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return seatsWithPeople
      .filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.seatNumber.toLowerCase().includes(q) ||
          s.blockName.toLowerCase().includes(q) ||
          s.categoryId.toLowerCase().includes(q) ||
          s.attendee?.name?.toLowerCase().includes(q) ||
          s.attendee?.department?.toLowerCase().includes(q)
      )
      .map((s) => s.id);
  }, [seatsWithPeople, searchQuery]);

  // Persist, but not on every keystroke — serialising 763 seats is not free.
  useEffect(() => {
    const id = window.setTimeout(() => savePlan(plan.present), 400);
    return () => window.clearTimeout(id);
  }, [plan.present]);

  // ---------------------------------------------------------------------
  // Plan mutations — every one goes through commit so it can be undone
  // ---------------------------------------------------------------------

  const handleApplyQuestionnaireAnswers = (next: QuestionnaireAnswers) => {
    plan.commit(
      (p) => ({ ...p, answers: next, seats: reallocateSeatsFromAnswers(p.seats, next) }),
      'Recalculate zones from the setup wizard'
    );
    setIsQuestionnaireModalOpen(false);
    showToast('Seating zones recalculated from your answers.');
  };

  const handleApplyPreset = (preset: SeatingPreset) => {
    plan.commit(
      (p) => ({
        ...p,
        answers: preset.answers,
        seats: reallocateSeatsFromAnswers(p.seats, preset.answers),
      }),
      `Load preset "${preset.name}"`
    );
    showToast(`Loaded preset: ${preset.name}`);
  };

  const handleResetToDefault = () => {
    if (!window.confirm('Reset everything back to the AIIMS Kalyani master blueprint?\n\nYou can still undo this afterwards.')) {
      return;
    }
    plan.commit(() => createDefaultPlan(), 'Reset to master blueprint');
    setSelectedSeatIds([]);
    showToast('Reset to the AIIMS Kalyani master blueprint.');
  };

  const handleClearAllSeating = () => {
    const seated = attendees.filter((a) => a.seatId).length;
    if (seated === 0) {
      showToast('Nobody is seated yet, so there is nothing to clear.', 'info');
      return;
    }
    if (!window.confirm(`Remove all ${seated} guests from their seats?\n\nThe roster is kept, and you can undo this.`)) {
      return;
    }
    plan.commit(
      (p) => ({ ...p, attendees: p.attendees.map((a) => ({ ...a, seatId: undefined })) }),
      'Clear every seat assignment'
    );
    showToast(`Emptied ${seated} seats. The guests are still on the roster.`);
  };

  const handleRegenerateLayout = () => {
    plan.commit(
      (p) => normalisePlan({ ...p, seats: reallocateSeatsFromAnswers(generateDefaultSeats(), p.answers) }),
      'Rebuild the seat layout'
    );
    showToast('Seat layout rebuilt from the current zone counts.');
  };

  const handleUpdateSeatsCategory = (seatIds: string[], categoryId: CategoryId) => {
    const wanted = new Set(seatIds);
    plan.commit(
      (p) => ({
        ...p,
        seats: p.seats.map((s) =>
          wanted.has(s.id) ? { ...s, categoryId, isBlocked: categoryId === 'blocked' } : s
        ),
      }),
      `Move ${seatIds.length} seat${seatIds.length === 1 ? '' : 's'} to another zone`
    );
    showToast(`Moved ${seatIds.length} seat${seatIds.length === 1 ? '' : 's'} into the new zone.`);
  };

  const handleToggleBlockedSeats = (seatIds: string[], isBlocked: boolean) => {
    const wanted = new Set(seatIds);
    plan.commit(
      (p) => ({
        ...p,
        seats: p.seats.map((s) => {
          if (!wanted.has(s.id)) return s;
          return {
            ...s,
            isBlocked,
            categoryId: isBlocked ? 'blocked' : s.categoryId === 'blocked' ? 'audience' : s.categoryId,
          };
        }),
        // A blocked seat cannot hold a guest.
        attendees: isBlocked
          ? p.attendees.map((a) => (a.seatId && wanted.has(a.seatId) ? { ...a, seatId: undefined } : a))
          : p.attendees,
      }),
      `${isBlocked ? 'Block' : 'Unblock'} ${seatIds.length} seat${seatIds.length === 1 ? '' : 's'}`
    );
    showToast(`${isBlocked ? 'Blocked' : 'Unblocked'} ${seatIds.length} seat${seatIds.length === 1 ? '' : 's'}.`);
  };

  /** Create or update the guest sitting in a seat. */
  const handleSaveAttendee = (seatId: string, data: Partial<Attendee>) => {
    plan.commit((p) => {
      const existingId = data.id;
      const others = p.attendees.filter((a) => a.id !== existingId && a.seatId !== seatId);
      const record: Attendee = {
        id: existingId || `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: data.name?.trim() || 'Unnamed guest',
        designation: data.designation,
        department: data.department,
        institution: data.institution || 'AIIMS Kalyani',
        email: data.email,
        phone: data.phone,
        categoryId: data.categoryId || 'faculty',
        notes: data.notes,
        seatId,
        isVip: (data.categoryId || 'faculty') === 'vip',
      };
      return { ...p, attendees: [...others, record] };
    }, `Seat ${data.name?.trim() || 'a guest'} in ${seatId}`);

    showToast(`${data.name?.trim() || 'Guest'} is seated in ${seatId}.`);
  };

  /** Move somebody who is already on the roster into a seat. */
  const handleAssignExistingAttendee = (seatId: string, attendeeId: string) => {
    const person = attendees.find((a) => a.id === attendeeId);
    plan.commit(
      (p) => ({
        ...p,
        attendees: p.attendees.map((a) => {
          if (a.id === attendeeId) return { ...a, seatId };
          // Whoever was in that seat gets bumped back to unseated.
          if (a.seatId === seatId) return { ...a, seatId: undefined };
          return a;
        }),
      }),
      `Seat ${person?.name ?? 'guest'} in ${seatId}`
    );
    showToast(`${person?.name ?? 'Guest'} is seated in ${seatId}.`);
  };

  const handleClearSeat = (seatId: string) => {
    plan.commit(
      (p) => ({
        ...p,
        attendees: p.attendees.map((a) => (a.seatId === seatId ? { ...a, seatId: undefined } : a)),
      }),
      `Empty seat ${seatId}`
    );
    showToast(`Seat ${seatId} is empty again. The guest stays on the roster.`);
  };

  const handleAutoSeat = () => {
    const result = autoSeatAttendees(seats, attendees);
    if (result.seated === 0) {
      showToast(result.summary, result.unseated.length > 0 ? 'error' : 'info');
      return;
    }
    plan.commit((p) => ({ ...p, attendees: result.attendees }), `Auto-seat ${result.seated} guests`);
    showToast(result.summary, result.unseated.length > 0 ? 'info' : 'success');
  };

  const handleAddAttendee = (newAtt: Attendee) => {
    plan.commit((p) => ({ ...p, attendees: [...p.attendees, newAtt] }), `Add ${newAtt.name} to the roster`);
    showToast(`Added ${newAtt.name} to the roster.`);
  };

  const handleUpdateAttendee = (updated: Attendee) => {
    plan.commit(
      (p) => ({ ...p, attendees: p.attendees.map((a) => (a.id === updated.id ? updated : a)) }),
      `Edit ${updated.name}`
    );
  };

  const handleDeleteAttendee = (id: string) => {
    const person = attendees.find((a) => a.id === id);
    plan.commit((p) => ({ ...p, attendees: p.attendees.filter((a) => a.id !== id) }), `Remove ${person?.name ?? 'guest'}`);
    showToast(`Removed ${person?.name ?? 'guest'} from the roster.`);
  };

  const handleImportAttendees = (newAttendees: Attendee[]) => {
    plan.commit(
      (p) => ({ ...p, attendees: [...p.attendees, ...newAttendees] }),
      `Import ${newAttendees.length} guests`
    );
    showToast(
      `Imported ${newAttendees.length} guests. Use "Auto-seat roster" to place them.`,
      'success'
    );
  };

  const handleAddVolunteer = (vol: Volunteer) => {
    plan.commit((p) => ({ ...p, volunteers: [...p.volunteers, vol] }), `Add volunteer ${vol.name}`);
    showToast(`Added volunteer checkpoint for ${vol.name}.`);
  };

  const handleUpdateVolunteer = (vol: Volunteer) => {
    plan.commit(
      (p) => ({ ...p, volunteers: p.volunteers.map((v) => (v.id === vol.id ? vol : v)) }),
      `Edit volunteer ${vol.name}`
    );
    showToast(`Updated volunteer ${vol.name}.`);
  };

  const handleDeleteVolunteer = (id: string) => {
    plan.commit((p) => ({ ...p, volunteers: p.volunteers.filter((v) => v.id !== id) }), 'Remove a volunteer');
    showToast('Removed the volunteer checkpoint.');
  };

  // ---------------------------------------------------------------------
  // Backup file in / out
  // ---------------------------------------------------------------------

  const handleExportJson = () => {
    exportConfigurationJson(seats, attendees, answers, volunteers);
    showToast('Backup file saved to your Downloads folder.');
  };

  const handleImportJsonFile = async (file: File) => {
    try {
      const data = await importConfigurationJson(file);
      plan.reset(
        normalisePlan({
          answers: data.answers ?? answers,
          seats: data.seats,
          attendees: data.attendees,
          volunteers: data.volunteers ?? volunteers,
        }),
        'Open backup file'
      );
      setSelectedSeatIds([]);
      setSearchQuery('');
      showToast(`Opened "${file.name}" — ${data.seats.length} seats, ${data.attendees.length} guests.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not open that file.', 'error');
    }
  };

  // ---------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------

  const handleToggleSelectSeat = (seat: Seat, multi: boolean) => {
    setSelectedSeatIds((prev) => {
      if (!multi) return prev.length === 1 && prev[0] === seat.id ? [] : [seat.id];
      return prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id];
    });
  };

  const handleSelectSeatIds = (ids: string[], additive: boolean) => {
    setSelectedSeatIds((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids));
  };

  const handleClearSelection = useCallback(() => setSelectedSeatIds([]), []);

  const handleSelectRow = (seat: Seat) => {
    const ids = seats.filter((s) => s.block === seat.block && s.row === seat.row).map((s) => s.id);
    setSelectedSeatIds(ids);
    showToast(`Selected all ${ids.length} seats in row ${seat.row}.`, 'info');
  };

  const handleSelectZone = (seat: Seat) => {
    const ids = seats.filter((s) => s.categoryId === seat.categoryId).map((s) => s.id);
    setSelectedSeatIds(ids);
    showToast(`Selected all ${ids.length} seats in that zone.`, 'info');
  };

  /** Jump the map to a seat — used by the roster's "show on map" links. */
  const handleSelectSeatOnMap = (seatId: string) => {
    if (!seats.some((s) => s.id === seatId)) return;
    setActiveTab('map');
    setSelectedSeatIds([seatId]);
    setFocusSeatId(seatId);
  };

  const handleJumpToFirstMatch = () => {
    if (matchingSeatIds.length === 0) return;
    setSelectedSeatIds([matchingSeatIds[0]]);
    setFocusSeatId(matchingSeatIds[0]);
  };

  // ---------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------

  useEffect(() => {
    const isTypingIn = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      return (
        node.tagName === 'INPUT' ||
        node.tagName === 'TEXTAREA' ||
        node.tagName === 'SELECT' ||
        node.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) plan.redo();
        else plan.undo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        plan.redo();
        return;
      }

      if (e.key === 'Escape') {
        handleClearSelection();
        return;
      }

      if (e.key === '/' && !isTypingIn(e.target)) {
        e.preventDefault();
        setActiveTab('map');
        // Wait for the map tab (and its search box) to be on screen.
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [plan, handleClearSelection]);

  const assignedCount = attendees.filter((a) => Boolean(a.seatId)).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Hidden picker behind the "Open backup file" menu item */}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportJsonFile(file);
          e.target.value = '';
        }}
      />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        eventTitle={answers.eventTitle}
        departmentName={answers.departmentName}
        totalSeats={seats.length}
        assignedSeatsCount={assignedCount}
        rosterCount={attendees.length}
        canUndo={plan.canUndo}
        canRedo={plan.canRedo}
        undoLabel={plan.undoLabel}
        redoLabel={plan.redoLabel}
        onUndo={plan.undo}
        onRedo={plan.redo}
        onApplyPreset={handleApplyPreset}
        onResetToDefault={handleResetToDefault}
        onClearAllSeating={handleClearAllSeating}
        onRegenerateLayout={handleRegenerateLayout}
        onOpenQuestionnaire={() => setIsQuestionnaireModalOpen(true)}
        onExportJson={handleExportJson}
        onOpenBackup={() => importInputRef.current?.click()}
      />

      <StatsBar
        seats={seatsWithPeople}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {activeTab === 'map' && (
        <>
          <SearchFilterBar
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onJumpToFirstMatch={handleJumpToFirstMatch}
            selectedTier={selectedTier}
            setSelectedTier={setSelectedTier}
            showVolunteers={showVolunteers}
            setShowVolunteers={setShowVolunteers}
            showAisles={showAisles}
            setShowAisles={setShowAisles}
            highlightedCount={matchingSeatIds.length}
            lowerCount={seats.filter((s) => s.tier === 'LOWER').length}
            upperCount={seats.filter((s) => s.tier === 'UPPER').length}
            totalCount={seats.length}
          />
          <PlanHealthBar
            issues={planIssues}
            unassignedCount={unassignedAttendees.length}
            onAutoSeat={handleAutoSeat}
            onOpenRoster={() => setActiveTab('roster')}
          />
        </>
      )}

      <main className="flex-1">
        {activeTab === 'map' && (
          <AuditoriumMap
            seats={seatsWithPeople}
            volunteers={volunteers}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedSeats={selectedSeats}
            unassignedAttendees={unassignedAttendees}
            onToggleSelectSeat={handleToggleSelectSeat}
            onSelectSeatIds={handleSelectSeatIds}
            onClearSelection={handleClearSelection}
            onSelectRow={handleSelectRow}
            onSelectZone={handleSelectZone}
            onUpdateSeatsCategory={handleUpdateSeatsCategory}
            onSaveAttendee={handleSaveAttendee}
            onAssignExistingAttendee={handleAssignExistingAttendee}
            onClearSeat={handleClearSeat}
            onToggleBlockedSeats={handleToggleBlockedSeats}
            searchQuery={searchQuery}
            matchingSeatIds={matchingSeatIds}
            selectedTier={selectedTier}
            showVolunteers={showVolunteers}
            showAisles={showAisles}
            eventTitle={answers.eventTitle}
            departmentName={answers.departmentName}
            focusSeatId={focusSeatId}
            onFocusHandled={() => setFocusSeatId(null)}
          />
        )}

        {activeTab === 'editor' && (
          <EditorTab
            answers={answers}
            onApplyAnswers={handleApplyQuestionnaireAnswers}
            seats={seats}
            selectedSeats={selectedSeats}
            unassignedAttendees={unassignedAttendees}
            onUpdateSeatsCategory={handleUpdateSeatsCategory}
            onSaveAttendee={handleSaveAttendee}
            onAssignExistingAttendee={handleAssignExistingAttendee}
            onClearSeat={handleClearSeat}
            onToggleBlockedSeats={handleToggleBlockedSeats}
            onClearSelection={handleClearSelection}
            onSelectRow={handleSelectRow}
            onSelectZone={handleSelectZone}
            volunteers={volunteers}
            onAddVolunteer={handleAddVolunteer}
            onUpdateVolunteer={handleUpdateVolunteer}
            onDeleteVolunteer={handleDeleteVolunteer}
          />
        )}

        {activeTab === 'roster' && (
          <AttendeeList
            attendees={attendees}
            seats={seatsWithPeople}
            issues={planIssues}
            onUpdateAttendee={handleUpdateAttendee}
            onDeleteAttendee={handleDeleteAttendee}
            onOpenAddModal={() => setIsAddAttendeeModalOpen(true)}
            onOpenCsvModal={() => setIsCsvModalOpen(true)}
            onSelectSeatOnMap={handleSelectSeatOnMap}
            onAutoSeat={handleAutoSeat}
            onClearAllSeating={handleClearAllSeating}
            onClearSeat={handleClearSeat}
            eventTitle={answers.eventTitle}
          />
        )}

        {activeTab === 'print' && (
          <PrintLayoutModal
            seats={seatsWithPeople}
            attendees={attendees}
            volunteers={volunteers}
            eventTitle={answers.eventTitle}
            departmentName={answers.departmentName}
            totalSeats={seats.length}
          />
        )}
      </main>

      {isQuestionnaireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl my-8">
            <QuestionnaireWizard
              answers={answers}
              onApplyAnswers={handleApplyQuestionnaireAnswers}
              onClose={() => setIsQuestionnaireModalOpen(false)}
            />
          </div>
        </div>
      )}

      <AddAttendeeModal
        isOpen={isAddAttendeeModalOpen}
        onClose={() => setIsAddAttendeeModalOpen(false)}
        onAdd={handleAddAttendee}
        availableSeats={seatsWithPeople.filter((s) => !s.isBlocked && !s.attendee)}
      />

      <CsvImportExport
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportAttendees={handleImportAttendees}
      />

    </div>
  );
}

export default App;
