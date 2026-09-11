import { Seat, QuestionnaireAnswers } from '../types/seating';
import { assignConvocationZones, DEFAULT_ZONE_COUNTS } from '../data/defaultSeatingData';

/**
 * Rebuilds the seat sections from the wizard's answers, using the same
 * convocation rules as the built-in layout (see assignConvocationZones).
 *
 * The rows for VIP, admin, reporters, IT staff and parents are fixed; the
 * faculty count decides how many middle-block rows go to faculty before the
 * students behind them. Guests are not moved — use Auto-seat afterwards.
 */
export function reallocateSeatsFromAnswers(
  currentSeats: Seat[],
  answers: QuestionnaireAnswers
): Seat[] {
  const faculty = Number.isFinite(answers.numFaculty) ? Math.max(0, answers.numFaculty) : DEFAULT_ZONE_COUNTS.faculty;
  return assignConvocationZones(currentSeats, { ...DEFAULT_ZONE_COUNTS, faculty });
}

/**
 * Validates questionnaire answer totals against auditorium capacity (750 / totalSeats)
 */
export function validateQuestionnaire(answers: QuestionnaireAnswers, capacity?: number): {
  isValid: boolean;
  totalRequested: number;
  difference: number;
  message: string;
} {
  const targetCapacity = capacity || answers.totalSeats || 750;
  const totalAllocated = 
    answers.numVip +
    answers.numSeniorFaculty +
    answers.numFaculty +
    answers.numAwardees +
    answers.numReporters +
    answers.numAccompanying +
    answers.numBandParty +
    answers.numConsole +
    answers.numBlocked +
    answers.numAudience;

  const diff = targetCapacity - totalAllocated;

  if (diff === 0) {
    return {
      isValid: true,
      totalRequested: totalAllocated,
      difference: 0,
      message: `Perfect! Total seats exactly match ${targetCapacity} capacity.`,
    };
  } else if (diff > 0) {
    return {
      isValid: true,
      totalRequested: totalAllocated,
      difference: diff,
      message: `${diff} unallocated seats will be marked as open / Available.`,
    };
  } else {
    return {
      isValid: false,
      totalRequested: totalAllocated,
      difference: diff,
      message: `Over-allocated by ${Math.abs(diff)} seats! Please adjust counts so total does not exceed ${targetCapacity}.`,
    };
  }
}
