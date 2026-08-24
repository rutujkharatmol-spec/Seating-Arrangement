import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Seat,
  Attendee,
  Volunteer,
  CategoryId,
  TierType,
  QuestionnaireAnswers,
  SeatingPreset,
  CategoryInfo,
} from './types/seating';
import { generateDefaultSeats } from './data/defaultSeatingData';
import { CATEGORIES } from './data/categories';
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
import { HowToUseBanner } from './components/UI/HowToUseBanner';
import { Toast, ToastKind } from './components/UI/Toast';
import { AuditoriumMap } from './components/AuditoriumMap/AuditoriumMap';
import { EditorTab } from './components/Editor/EditorTab';
import { QuestionnaireWizard } from './components/Editor/QuestionnaireWizard';
import { SectionManagerModal } from './components/Editor/SectionManagerModal';
import { AttendeeList } from './components/AttendeeRoster/AttendeeList';
import { AddAttendeeModal } from './components/AttendeeRoster/AddAttendeeModal';
import { CsvImportExport } from './components/AttendeeRoster/CsvImportExport';
import { PrintLayoutModal } from './components/PrintAndExport/PrintLayoutModal';
import { SeatTrackerKiosk } from './components/Kiosk/SeatTrackerKiosk';

type TabId = 'map' | 'editor' | 'roster' | 'print';

export function App() {
  const plan = useHistory<PlanState>(loadPlan);
  const { seats, attendees, volunteers, answers, categories: planCategories } = plan.present;
  const categories = planCategories || CATEGORIES;

  // Route check for /seattracker or /findmyseat
  const isTrackerUrl = () => {
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    const s = window.location.search.toLowerCase();
    return (
      p.includes('seattracker') ||
      h.includes('seattracker') ||
      s.includes('seattracker') ||
      p.includes('findmyseat') ||
      h.includes('findmyseat')
    );
  };

  const [isKioskMode, setIsKioskMode] = useState(isTrackerUrl);

  useEffect(() => {
    const checkUrl = () => setIsKioskMode(isTrackerUrl());
    window.addEventListener('popstate', checkUrl);
    window.addEventListener('hashchange', checkUrl);
    return () => {
      window.removeEventListener('popstate', checkUrl);
      window.removeEventListener('hashchange', checkUrl);
    };
  }, []);

  // Navigation & view state
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<TierType | 'ALL'>('ALL');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [showAisles, setShowAisles] = useState(true);
  const [focusSeatId, setFocusSeatId] = useState<string | null>(null);

  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] = useState(false);
  const [isSectionManagerOpen, setIsSectionManagerOpen] = useState(false);
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

  const seatsWithPeople = useMemo(() => withAttendees(seats, attendees), [seats, attendees]);

  const selectedSeats = useMemo(() => {
    if (selectedSeatIds.length === 0) return [];
    const wanted = new Set(selectedSeatIds);
    return seatsWithPeople.filter((s) => wanted.has(s.id));
  }, [seatsWithPeople, selectedSeatIds]);

  const unassignedAttendees = useMemo(() => attendees.filter((a) => !a.seatId), [attendees]);

  const planIssues = useMemo(() => findPlanIssues(seats, attendees), [seats, attendees]);

  const categorySeatCounts = useMemo(() => {
    const counts = {} as Record<string, number>;
    seats.forEach((s) => {
      counts[s.categoryId] = (counts[s.categoryId] ?? 0) + 1;
    });
    return counts;
  }, [seats]);

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
          (s.attendee?.designation && s.attendee.designation.toLowerCase().includes(q)) ||
          (s.attendee?.department && s.attendee.department.toLowerCase().includes(q))
      )
      .map((s) => s.id);
  }, [seatsWithPeople, searchQuery]);

  // Persist plan changes
  useEffect(() => {
    savePlan(plan.present);
  }, [plan.present]);

  // ---------------------------------------------------------------------
  // Section Management Handlers
  // ---------------------------------------------------------------------

  const handleAddCategory = (newCat: CategoryInfo) => {
    plan.commit(
      (p) => ({
        ...p,
        categories: {
          ...(p.categories || CATEGORIES),
          [newCat.id]: newCat,
        },
      }),
      `Add section "${newCat.name}"`
    );
    showToast(`Added section "${newCat.name}"`);
  };

  const handleUpdateCategory = (updatedCat: CategoryInfo) => {
    plan.commit(
      (p) => ({
        ...p,
        categories: {
          ...(p.categories || CATEGORIES),
          [updatedCat.id]: updatedCat,
        },
      }),
      `Update section "${updatedCat.name}"`
    );
    showToast(`Updated section "${updatedCat.name}"`);
  };

  const handleDeleteCategory = (catId: string) => {
    const catName = categories[catId]?.name || catId;
    plan.commit(
      (p) => {
        const next = { ...(p.categories || CATEGORIES) };
        delete next[catId];
        const seats = p.seats.map((s) => (s.categoryId === catId ? { ...s, categoryId: 'audience' } : s));
        const attendees = p.attendees.map((a) => (a.categoryId === catId ? { ...a, categoryId: 'faculty' } : a));
        return {
          ...p,
          categories: next,
          seats,
          attendees,
        };
      },
      `Delete section "${catName}"`
    );
    showToast(`Deleted section "${catName}". Assigned seats changed to Audience.`);
  };

  const handleResetCategoriesToDefault = () => {
    plan.commit(
      (p) => ({
        ...p,
        categories: { ...CATEGORIES },
      }),
      'Reset sections to default'
    );
    showToast('Reset sections and colors to default');
  };

  // ---------------------------------------------------------------------
  // Seat & Attendee Handlers
  // ---------------------------------------------------------------------

  const handleToggleSelectSeat = (seat: Seat, multi: boolean) => {
    setSelectedSeatIds((prev) => {
      if (!multi) {
        return prev.length === 1 && prev[0] === seat.id ? [] : [seat.id];
      }
      return prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id];
    });
  };

  const handleSelectSeatIds = (ids: string[], additive: boolean) => {
    setSelectedSeatIds((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids));
  };

  const handleClearSelection = useCallback(() => setSelectedSeatIds([]), []);

  const handleSelectRow = (seat: Seat) => {
    const rowSeats = seats.filter((s) => s.tier === seat.tier && s.block === seat.block && s.row === seat.row);
    setSelectedSeatIds(rowSeats.map((s) => s.id));
  };

  const handleSelectZone = (seat: Seat) => {
    const zoneSeats = seats.filter((s) => s.categoryId === seat.categoryId);
    setSelectedSeatIds(zoneSeats.map((s) => s.id));
  };

  const handleUpdateSeatsCategory = (seatIds: string[], categoryId: CategoryId) => {
    if (seatIds.length === 0) return;
    const targetSet = new Set(seatIds);
    const catName = categories[categoryId]?.shortName || categoryId;

    plan.commit(
      (p) => ({
        ...p,
        seats: p.seats.map((s) => {
          if (!targetSet.has(s.id)) return s;
          return {
            ...s,
            categoryId,
            isBlocked: categoryId === 'blocked',
          };
        }),
      }),
      seatIds.length === 1 ? `Change seat ${seatIds[0]} to ${catName}` : `Set ${seatIds.length} seats to ${catName}`
    );
    showToast(`Updated ${seatIds.length} seat(s) to ${catName}`);
  };

  const handleToggleBlockedSeats = (seatIds: string[], isBlocked: boolean) => {
    if (seatIds.length === 0) return;
    const targetSet = new Set(seatIds);
    plan.commit(
      (p) => ({
        ...p,
        seats: p.seats.map((s) => (targetSet.has(s.id) ? { ...s, isBlocked } : s)),
      }),
      isBlocked ? `Block ${seatIds.length} seats` : `Unblock ${seatIds.length} seats`
    );
    showToast(`${isBlocked ? 'Blocked' : 'Unblocked'} ${seatIds.length} seat(s)`);
  };

  const handleSaveAttendee = (seatId: string, attendeeData: Partial<Attendee>) => {
    plan.commit((p) => {
      const existing = p.attendees.find((a) => a.seatId === seatId);
      let nextAttendees: Attendee[];

      if (existing) {
        nextAttendees = p.attendees.map((a) =>
          a.id === existing.id
            ? ({
                ...a,
                ...attendeeData,
                seatId,
                name: attendeeData.name ?? a.name,
                categoryId: attendeeData.categoryId ?? a.categoryId,
              } as Attendee)
            : a
        );
      } else {
        const newAttendee: Attendee = {
          id: attendeeData.id || `att-${Date.now()}`,
          name: attendeeData.name || 'Unnamed Guest',
          designation: attendeeData.designation,
          department: attendeeData.department,
          institution: attendeeData.institution,
          email: attendeeData.email,
          phone: attendeeData.phone,
          categoryId: attendeeData.categoryId || 'faculty',
          seatId,
          isVip: attendeeData.isVip,
        };
        nextAttendees = [...p.attendees, newAttendee];
      }

      return { ...p, attendees: nextAttendees };
    }, `Seat ${attendeeData.name || 'guest'} on ${seatId}`);

    showToast(`Seated ${attendeeData.name || 'guest'} on ${seatId}`);
  };

  const handleAssignExistingAttendee = (seatId: string, attendeeId: string) => {
    plan.commit((p) => {
      const target = p.attendees.find((a) => a.id === attendeeId);
      if (!target) return p;

      const nextAttendees = p.attendees.map((a) => {
        if (a.seatId === seatId && a.id !== attendeeId) return { ...a, seatId: undefined };
        if (a.id === attendeeId) return { ...a, seatId };
        return a;
      });

      return { ...p, attendees: nextAttendees };
    }, `Seat guest on ${seatId}`);

    showToast(`Seated guest on ${seatId}`);
  };

  const handleClearSeat = (seatId: string) => {
    plan.commit(
      (p) => ({
        ...p,
        attendees: p.attendees.map((a) => (a.seatId === seatId ? { ...a, seatId: undefined } : a)),
      }),
      `Empty seat ${seatId}`
    );
    showToast(`Emptied seat ${seatId}`);
  };

  const handleSwapSeats = (seatIdA: string, seatIdB: string) => {
    const attA = attendees.find((a) => a.seatId === seatIdA);
    const attB = attendees.find((a) => a.seatId === seatIdB);

    if (!attA && !attB) {
      showToast(`Both ${seatIdA} and ${seatIdB} are empty seats.`, 'info');
      return;
    }

    plan.commit((p) => {
      const pAttA = p.attendees.find((a) => a.seatId === seatIdA);
      const pAttB = p.attendees.find((a) => a.seatId === seatIdB);

      const nextAttendees = p.attendees.map((a) => {
        if (pAttA && a.id === pAttA.id) {
          return { ...a, seatId: seatIdB };
        }
        if (pAttB && a.id === pAttB.id) {
          return { ...a, seatId: seatIdA };
        }
        return a;
      });

      return {
        ...p,
        attendees: nextAttendees,
      };
    }, `Swap seats ${seatIdA} ⇄ ${seatIdB}`);

    const nameA = attA?.name || `Seat ${seatIdA}`;
    const nameB = attB?.name || `Seat ${seatIdB}`;
    showToast(`Swapped positions: ${nameA} ⇄ ${nameB}`);
  };

  const handleApplyQuestionnaireAnswers = (newAnswers: QuestionnaireAnswers) => {
    plan.commit((p) => {
      const reallocated = reallocateSeatsFromAnswers(p.seats, newAnswers);
      return {
        ...p,
        answers: newAnswers,
        seats: reallocated,
      };
    }, 'Auto-arrange seating blueprint');

    setIsQuestionnaireModalOpen(false);
    showToast('Applied seating plan calculation successfully');
  };

  const handleApplyPreset = (preset: SeatingPreset) => {
    handleApplyQuestionnaireAnswers({
      ...preset.answers,
      eventTitle: preset.eventTitle,
      departmentName: preset.departmentName,
    });
    showToast(`Applied preset "${preset.name}"`);
  };

  const handleResetToDefaultLayout = () => {
    plan.commit(() => createDefaultPlan(), 'Reset to factory blueprint');
    setSelectedSeatIds([]);
    showToast('Reset auditorium to initial blueprint layout');
  };

  const handleAutoSeat = () => {
    const result = autoSeatAttendees(seats, attendees);
    plan.commit(
      (p) => ({
        ...p,
        attendees: result.attendees,
      }),
      `Auto-seat ${result.seated} guests`
    );
    showToast(`Seated ${result.seated} guests automatically`);
  };

  const handleClearAllSeating = () => {
    plan.commit(
      (p) => ({
        ...p,
        attendees: p.attendees.map((a) => ({ ...a, seatId: undefined })),
      }),
      'Clear all seat assignments'
    );
    showToast('Cleared all guest seating assignments');
  };

  const handleAddAttendee = (newAttendee: Attendee) => {
    plan.commit((p) => ({ ...p, attendees: [...p.attendees, newAttendee] }), `Add guest ${newAttendee.name}`);
    showToast(`Added ${newAttendee.name} to roster`);
  };

  const handleUpdateAttendee = (updated: Attendee) => {
    plan.commit(
      (p) => ({
        ...p,
        attendees: p.attendees.map((a) => (a.id === updated.id ? updated : a)),
      }),
      `Update ${updated.name}`
    );
    showToast(`Updated ${updated.name}`);
  };

  const handleDeleteAttendee = (id: string) => {
    const target = attendees.find((a) => a.id === id);
    plan.commit(
      (p) => ({
        ...p,
        attendees: p.attendees.filter((a) => a.id !== id),
      }),
      `Remove ${target?.name || 'guest'}`
    );
    showToast(`Removed guest from roster`);
  };

  const handleImportAttendees = (imported: Attendee[]) => {
    plan.commit(
      (p) => ({
        ...p,
        attendees: [...p.attendees, ...imported],
      }),
      `Import ${imported.length} guests`
    );
    showToast(`Imported ${imported.length} guests successfully`);
  };

  const handleAddVolunteer = (vol: Volunteer) => {
    plan.commit((p) => ({ ...p, volunteers: [...p.volunteers, vol] }), `Add volunteer ${vol.name}`);
    showToast(`Added volunteer ${vol.name}`);
  };

  const handleUpdateVolunteer = (vol: Volunteer) => {
    plan.commit(
      (p) => ({
        ...p,
        volunteers: p.volunteers.map((v) => (v.id === vol.id ? vol : v)),
      }),
      `Update volunteer ${vol.name}`
    );
    showToast(`Updated volunteer ${vol.name}`);
  };

  const handleDeleteVolunteer = (id: string) => {
    plan.commit(
      (p) => ({
        ...p,
        volunteers: p.volunteers.filter((v) => v.id !== id),
      }),
      'Delete volunteer'
    );
    showToast('Removed volunteer');
  };

  const handleSelectSeatOnMap = (seatId: string) => {
    setActiveTab('map');
    setSelectedSeatIds([seatId]);
    setFocusSeatId(seatId);
  };

  const handleExportJson = () => {
    exportConfigurationJson(plan.present);
    showToast('Exported backup configuration file');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importConfigurationJson(
      file,
      (imported) => {
        plan.commit(() => normalisePlan(imported), `Import ${file.name}`);
        showToast('Restored backup seating configuration');
      },
      (err) => showToast(`Import failed: ${err.message}`, 'error')
    );
    e.target.value = '';
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
        if (isQuestionnaireModalOpen) setIsQuestionnaireModalOpen(false);
        else if (isSectionManagerOpen) setIsSectionManagerOpen(false);
        else handleClearSelection();
        return;
      }

      if (e.key === '/' && !isTypingIn(e.target)) {
        e.preventDefault();
        setActiveTab('map');
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [plan, handleClearSelection, isQuestionnaireModalOpen, isSectionManagerOpen]);

  const assignedCount = attendees.filter((a) => Boolean(a.seatId)).length;

  // ---------------------------------------------------------------------
  // If in Kiosk Mode (/seattracker) -> Render Dedicated Fullscreen Kiosk
  // ---------------------------------------------------------------------
  if (isKioskMode) {
    return (
      <SeatTrackerKiosk
        seats={seatsWithPeople}
        attendees={attendees}
        volunteers={volunteers}
        categories={categories}
        eventTitle={answers.eventTitle}
        departmentName={answers.departmentName}
        onNavigateToAdmin={() => {
          window.history.pushState({}, '', '/');
          setIsKioskMode(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJsonFile}
        className="hidden"
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
        onUndo={plan.undo}
        onRedo={plan.redo}
        onOpenQuestionnaire={() => setIsQuestionnaireModalOpen(true)}
        onApplyPreset={handleApplyPreset}
        onResetToDefault={handleResetToDefaultLayout}
        onExportJson={handleExportJson}
        onOpenBackup={() => importInputRef.current?.click()}
        onLaunchKiosk={() => {
          window.history.pushState({}, '', '/seattracker');
          setIsKioskMode(true);
        }}
      />

      <HowToUseBanner
        onOpenWizard={() => setIsQuestionnaireModalOpen(true)}
      />

      <StatsBar
        seats={seatsWithPeople}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categories={categories}
        onOpenSectionManager={() => setIsSectionManagerOpen(true)}
      />

      {activeTab === 'map' && (
        <>
          <SearchFilterBar
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedTier={selectedTier}
            setSelectedTier={setSelectedTier}
            showVolunteers={showVolunteers}
            setShowVolunteers={setShowVolunteers}
            showAisles={showAisles}
            setShowAisles={setShowAisles}
            onJumpToFirstMatch={handleJumpToFirstMatch}
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
            onUpdateEventMetadata={(title, dept) =>
              plan.commit(
                (p) => ({ ...p, answers: { ...p.answers, eventTitle: title, departmentName: dept } }),
                'Edit Event Details'
              )
            }
            categories={categories}
            onOpenSectionManager={() => setIsSectionManagerOpen(true)}
            answers={answers}
            onApplyAnswers={handleApplyQuestionnaireAnswers}
            onAddVolunteer={handleAddVolunteer}
            onUpdateVolunteer={handleUpdateVolunteer}
            onDeleteVolunteer={handleDeleteVolunteer}
            onSwapSeats={handleSwapSeats}
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
            onSwapSeats={handleSwapSeats}
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
            categories={categories}
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
            categories={categories}
          />
        )}
      </main>

      {/* Auto-Arrange Questionnaire Modal */}
      {isQuestionnaireModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsQuestionnaireModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-4xl my-8">
            <QuestionnaireWizard
              answers={answers}
              onApplyAnswers={handleApplyQuestionnaireAnswers}
              onClose={() => setIsQuestionnaireModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Dynamic Section & Colors Manager Modal */}
      <SectionManagerModal
        isOpen={isSectionManagerOpen}
        onClose={() => setIsSectionManagerOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetCategoriesToDefault={handleResetCategoriesToDefault}
        seatCounts={categorySeatCounts}
      />

      <AddAttendeeModal
        isOpen={isAddAttendeeModalOpen}
        onClose={() => setIsAddAttendeeModalOpen(false)}
        onAdd={handleAddAttendee}
        availableSeats={seatsWithPeople.filter((s) => !s.isBlocked && !s.attendee)}
        categories={categories}
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
