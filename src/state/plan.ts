import { Attendee, QuestionnaireAnswers, Seat, Volunteer } from '../types/seating';
import { generateDefaultSeats, INITIAL_QUESTIONNAIRE_ANSWERS } from '../data/defaultSeatingData';
import { INITIAL_ATTENDEES } from '../data/initialAttendees';
import { DEFAULT_VOLUNTEERS } from '../data/categories';

/**
 * The complete seating plan — everything that gets saved, undone, exported and
 * printed. Keeping it in one object is what makes undo/redo and "export a file
 * and open it on another computer" work reliably.
 *
 * Note: `seats` never stores the attendee record itself, only the seat's own
 * properties. Who sits where lives on `attendee.seatId` alone, so the two can
 * never disagree. The joined view is built at render time by `withAttendees`.
 */
export interface PlanState {
  answers: QuestionnaireAnswers;
  seats: Seat[];
  attendees: Attendee[];
  volunteers: Volunteer[];
}

const STORAGE_KEY = 'aiims_seating_plan_v2';

/** Legacy keys from the first version, migrated once then left alone. */
const LEGACY_KEYS = {
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
  };
}

/**
 * Strips any stale embedded attendee data off seats and drops seat assignments
 * that point at seats which no longer exist, so an imported or older file can
 * never show a guest on a seat that isn't there.
 */
export function normalisePlan(plan: PlanState): PlanState {
  const seatIds = new Set(plan.seats.map((s) => s.id));

  const seats = plan.seats.map((s) => {
    const { attendee: _attendee, attendeeId: _attendeeId, ...rest } = s;
    return rest as Seat;
  });

  // One seat can hold one person; if a file has duplicates, the first wins.
  const claimed = new Set<string>();
  const attendees = plan.attendees.map((a) => {
    if (!a.seatId) return a;
    if (!seatIds.has(a.seatId) || claimed.has(a.seatId)) {
      return { ...a, seatId: undefined };
    }
    claimed.add(a.seatId);
    return a;
  });

  return { ...plan, seats, attendees };
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
