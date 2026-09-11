import { Attendee, CategoryInfo, QuestionnaireAnswers, Seat, Volunteer } from '../types/seating';
import {
  CONVOCATION_LAYOUT_VERSION,
  generateDefaultSeats,
  INITIAL_QUESTIONNAIRE_ANSWERS,
} from '../data/defaultSeatingData';
import { INITIAL_ATTENDEES } from '../data/initialAttendees';
import { CATEGORIES, DEFAULT_VOLUNTEERS } from '../data/categories';
import { seatRosterByZone } from '../utils/autoSeat';

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
  /** Which zone layout the seats follow; see migratePlanLayout. */
  layoutVersion?: string;
}

const STORAGE_KEY = 'aiims_seating_plan_v14';

export function createDefaultPlan(): PlanState {
  const attendees = [...INITIAL_ATTENDEES];
  const seats = withAttendees(generateDefaultSeats(), attendees);
  return {
    answers: INITIAL_QUESTIONNAIRE_ANSWERS,
    seats,
    attendees,
    volunteers: DEFAULT_VOLUNTEERS,
    categories: { ...CATEGORIES },
    layoutVersion: CONVOCATION_LAYOUT_VERSION,
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
    const catId = categories[s.categoryId] ? s.categoryId : 'available';
    return {
      ...rest,
      categoryId: catId,
    } as Seat;
  });

  // One seat can hold one person; if a file has duplicates, the first wins.
  const claimed = new Set<string>();
  const rawAttendees = plan.attendees !== undefined ? plan.attendees : [...INITIAL_ATTENDEES];
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
    layoutVersion: plan.layoutVersion,
  };
}

/** Sections retired when the convocation layout was redrawn. */
const RETIRED_CATEGORY_IDS = new Set(['awardees', 'audience', 'blocked', 'vvip']);

/**
 * Moves a plan saved under an older zone layout onto the current one: fresh
 * zones, built-in sections from the current defaults (custom sections kept),
 * and every guest on the roster re-seated in roster order. Guests added after
 * the built-in list are kept too. Runs once per plan — the version stamp
 * makes it a no-op afterwards, so later manual edits are never undone.
 */
export function migratePlanLayout(plan: PlanState): PlanState {
  if (plan.layoutVersion === CONVOCATION_LAYOUT_VERSION) return plan;

  const categories: Record<string, CategoryInfo> = { ...CATEGORIES };
  Object.values(plan.categories || {}).forEach((c) => {
    if (c.isCustom && !RETIRED_CATEGORY_IDS.has(c.id)) categories[c.id] = c;
  });

  const seats = generateDefaultSeats();
  const roster = plan.attendees.map((a) => {
    const categoryId = a.categoryId === 'vvip' ? 'vip' : categories[a.categoryId] ? a.categoryId : 'faculty';
    return { ...a, categoryId, seatId: undefined };
  });
  const { attendees } = seatRosterByZone(seats, roster);

  const { eventTitle, departmentName, notes } = plan.answers || INITIAL_QUESTIONNAIRE_ANSWERS;

  return {
    ...plan,
    answers: { ...INITIAL_QUESTIONNAIRE_ANSWERS, eventTitle, departmentName, notes },
    seats,
    attendees,
    categories,
    layoutVersion: CONVOCATION_LAYOUT_VERSION,
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
    return attendee
      ? {
          ...s,
          attendee,
          attendeeId: attendee.id,
          categoryId: attendee.categoryId || s.categoryId,
        }
      : s;
  });
}

export function loadPlan(): PlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlanState;
      const seatedCount = parsed?.attendees?.filter((a) => Boolean(a.seatId))?.length || 0;
      // Only keep cached plan if it has seats and at least 500 seated attendees
      if (parsed?.seats?.length && seatedCount >= 500) {
        return migratePlanLayout(normalisePlan(parsed));
      }
    }
  } catch {
    // Corrupt storage should never block the app from opening.
  }

  // Clear older versions and unseated caches
  try {
    localStorage.removeItem('aiims_seating_plan_v7');
    localStorage.removeItem('aiims_seating_plan_v8');
    localStorage.removeItem('aiims_seating_plan_v9');
    localStorage.removeItem('aiims_seating_plan_v10');
    localStorage.removeItem('aiims_seating_plan_v11');
    localStorage.removeItem('aiims_seating_plan_v12');
    localStorage.removeItem('aiims_seating_plan_v13');
    localStorage.removeItem('aiims_kalyani_mobile_cached_plan');
    localStorage.removeItem('aiims_kalyani_mobile_cached_plan_v12');
    localStorage.removeItem('aiims_kalyani_mobile_cached_plan_v13');
  } catch {
    // Ignore storage errors
  }

  const defaultPlan = createDefaultPlan();
  savePlan(defaultPlan);
  return defaultPlan;
}

export function savePlan(plan: PlanState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Quota errors are not worth interrupting the user's work over.
  }
}
