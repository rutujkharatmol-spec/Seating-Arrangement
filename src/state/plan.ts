import { Attendee, CategoryInfo, QuestionnaireAnswers, Seat, Volunteer } from '../types/seating';
import { generateDefaultSeats, INITIAL_QUESTIONNAIRE_ANSWERS } from '../data/defaultSeatingData';
import { INITIAL_ATTENDEES } from '../data/initialAttendees';
import { CATEGORIES, DEFAULT_VOLUNTEERS } from '../data/categories';

/**
 * The complete seating plan — everything that gets saved, undone, exported and
 * printed. Keeping it in one object is what makes undo/redo and "export a file
 * and open it on another computer" work reliably.
 */
export interface PlanState {
  answers: QuestionnaireAnswers;
  seats: Seat[];
  attendees: Attendee[];
  volunteers: Volunteer[];
  categories: Record<string, CategoryInfo>;
}

const STORAGE_KEY = 'aiims_seating_plan_v3';

/** Legacy keys from previous versions */
const LEGACY_KEYS = {
  v2: 'aiims_seating_plan_v2',
  answers: 'aiims_seating_answers',
  seats: 'aiims_seating_seats',
  attendees: 'aiims_seating_attendees',
  volunteers: 'aiims_seating_volunteers',
};

export function createDefaultPlan(): PlanState {
  return {
    answers: INITIAL_QUESTIONNAIRE_ANSWERS,
    seats: generateDefaultSeats(),
    attendees: INITIAL_ATTENDEES,
    volunteers: DEFAULT_VOLUNTEERS,
    categories: { ...CATEGORIES },
  };
}

/**
 * Normalises the plan so all seat assignments, category IDs, and attendee IDs
 * are valid and consistent.
 */
export function normalisePlan(plan: Partial<PlanState>): PlanState {
  const categories: Record<string, CategoryInfo> = {
    ...CATEGORIES,
    ...(plan.categories || {}),
  };

  const rawSeats = plan.seats && plan.seats.length > 0 ? plan.seats : generateDefaultSeats();
  const seatIds = new Set(rawSeats.map((s) => s.id));

  const seats = rawSeats.map((s) => {
    const { attendee: _attendee, attendeeId: _attendeeId, ...rest } = s;
    const catId = categories[s.categoryId] ? s.categoryId : 'audience';
    return {
      ...rest,
      categoryId: catId,
    } as Seat;
  });

  // One seat can hold one person; if a file has duplicates, the first wins.
  const claimed = new Set<string>();
  const rawAttendees = plan.attendees || INITIAL_ATTENDEES;
  const attendees = rawAttendees.map((a) => {
    const catId = categories[a.categoryId] ? a.categoryId : 'faculty';
    if (!a.seatId) return { ...a, categoryId: catId };
    if (!seatIds.has(a.seatId) || claimed.has(a.seatId)) {
      return { ...a, categoryId: catId, seatId: undefined };
    }
    claimed.add(a.seatId);
    return { ...a, categoryId: catId };
  });

  return {
    answers: plan.answers || INITIAL_QUESTIONNAIRE_ANSWERS,
    seats,
    attendees,
    volunteers: plan.volunteers || DEFAULT_VOLUNTEERS,
    categories,
  };
}

/** Joins attendees onto seats for display. Cheap, and always consistent. */
export function withAttendees(seats: Seat[], attendees: Attendee[]): Seat[] {
  const bySeat = new Map<string, Attendee>();
  attendees.forEach((a) => {
    if (a.seatId) bySeat.set(a.seatId, a);
  });

  return seats.map((s) => {
    const attendee = bySeat.get(s.id);
    return attendee ? { ...s, attendee, attendeeId: attendee.id } : s;
  });
}

export function loadPlan(): PlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlanState;
      if (parsed?.seats?.length) return normalisePlan(parsed);
    }
  } catch {
    // Corrupt storage should never block the app from opening.
  }

  const migrated = loadLegacyPlan();
  if (migrated) return migrated;

  return createDefaultPlan();
}

function loadLegacyPlan(): PlanState | null {
  try {
    const v2Raw = localStorage.getItem(LEGACY_KEYS.v2);
    if (v2Raw) {
      const v2 = JSON.parse(v2Raw) as PlanState;
      if (v2?.seats?.length) return normalisePlan(v2);
    }

    const seatsRaw = localStorage.getItem(LEGACY_KEYS.seats);
    if (!seatsRaw) return null;

    const seats = JSON.parse(seatsRaw) as Seat[];
    if (!seats?.length) return null;

    const read = <T,>(key: string, fallback: T): T => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    };

    return normalisePlan({
      seats,
      answers: read(LEGACY_KEYS.answers, INITIAL_QUESTIONNAIRE_ANSWERS),
      attendees: read(LEGACY_KEYS.attendees, INITIAL_ATTENDEES),
      volunteers: read(LEGACY_KEYS.volunteers, DEFAULT_VOLUNTEERS),
      categories: { ...CATEGORIES },
    });
  } catch {
    return null;
  }
}

export function savePlan(plan: PlanState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Quota errors are not worth interrupting the user's work over.
  }
}
