import { Seat, QuestionnaireAnswers, CategoryId } from '../types/seating';

/**
 * Re-allocates seats intelligently across the 750-seat auditorium based on questionnaire answers
 */
export function reallocateSeatsFromAnswers(
  currentSeats: Seat[],
  answers: QuestionnaireAnswers
): Seat[] {
  // Clone seats
  const newSeats: Seat[] = currentSeats.map((s) => ({ ...s, isBlocked: false }));

  // Create category demand quotas
  const demand: Record<CategoryId, number> = {
    vip: answers.numVip,
    senior_faculty: answers.numSeniorFaculty,
    faculty: answers.numFaculty,
    awardees: answers.numAwardees,
    reporters: answers.numReporters,
    accompanying: answers.numAccompanying,
    band_party: answers.numBandParty,
    console: answers.numConsole,
    blocked: answers.numBlocked,
    audience: answers.numAudience,
    available: 0,
  };

  // 1. Assign Band Party to Upper Center (Rows UB1 to UB3, then UB4)
  const upperCenterSeats = newSeats.filter((s) => s.block === 'UPPER_CENTER');
  // Sort from bottom row to top row: UB1, UB2, UB3, UB4, UB5
  upperCenterSeats.sort((a, b) => a.row.localeCompare(b.row));

  let bandAssigned = 0;
  for (const s of upperCenterSeats) {
    if (bandAssigned < demand.band_party) {
      s.categoryId = 'band_party';
      bandAssigned++;
    } else {
      s.categoryId = 'audience';
    }
  }

  // 2. Upper Left and Upper Right default to Audience
  newSeats.forEach((s) => {
    if (s.block === 'UPPER_LEFT' || s.block === 'UPPER_RIGHT') {
      s.categoryId = 'audience';
    }
  });

  // 3. Lower Right: Front rows (A-H) for Blocked seats, middle (I-O) for Awardees, rest for Accompanying
  const lowerRightSeats = newSeats.filter((s) => s.block === 'LOWER_RIGHT');
  // Sort from front (A) to back (X)
  const rowOrder = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X'];
  lowerRightSeats.sort((a, b) => rowOrder.indexOf(a.row) - rowOrder.indexOf(b.row) || a.col - b.col);

  let blockedAssigned = 0;
  let awardeesAssigned = 0;
  let accompanyingAssignedRight = 0;

  for (const s of lowerRightSeats) {
    if (blockedAssigned < demand.blocked) {
      s.categoryId = 'blocked';
      s.isBlocked = true;
      blockedAssigned++;
    } else if (awardeesAssigned < demand.awardees) {
      s.categoryId = 'awardees';
      awardeesAssigned++;
    } else if (accompanyingAssignedRight < demand.accompanying) {
      s.categoryId = 'accompanying';
      accompanyingAssignedRight++;
    } else {
      s.categoryId = 'audience';
    }
  }

  // 4. Lower Left: Front rows (A-H) for Senior Faculty + Registrar, mid (I-M) for Console, rear (N-X) for Audience
  const lowerLeftSeats = newSeats.filter((s) => s.block === 'LOWER_LEFT');
  lowerLeftSeats.sort((a, b) => rowOrder.indexOf(a.row) - rowOrder.indexOf(b.row) || a.col - b.col);

  let srFacultyAssigned = 0;
  let consoleAssigned = 0;

  for (const s of lowerLeftSeats) {
    if (srFacultyAssigned < demand.senior_faculty) {
      s.categoryId = 'senior_faculty';
      srFacultyAssigned++;
    } else if (consoleAssigned < demand.console) {
      s.categoryId = 'console';
      consoleAssigned++;
    } else {
      s.categoryId = 'audience';
    }
  }

  // 5. Lower Center: VIP (Front rows A..), then Reporters, then Faculty, then remaining Accompanying, then Audience
  const lowerCenterSeats = newSeats.filter((s) => s.block === 'LOWER_CENTER');
  lowerCenterSeats.sort((a, b) => rowOrder.indexOf(a.row) - rowOrder.indexOf(b.row) || a.col - b.col);

  let vipAssigned = 0;
  let reportersAssigned = 0;
  let facultyAssigned = 0;
  let accompanyingRemaining = Math.max(0, demand.accompanying - accompanyingAssignedRight);

  for (const s of lowerCenterSeats) {
    if (vipAssigned < demand.vip) {
      s.categoryId = 'vip';
      vipAssigned++;
    } else if (reportersAssigned < demand.reporters) {
      s.categoryId = 'reporters';
      reportersAssigned++;
    } else if (facultyAssigned < demand.faculty) {
      s.categoryId = 'faculty';
      facultyAssigned++;
    } else if (accompanyingRemaining > 0) {
      s.categoryId = 'accompanying';
      accompanyingRemaining--;
    } else {
      s.categoryId = 'audience';
    }
  }

  return newSeats;
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
      message: `${diff} unallocated seats will be marked as open General Audience / Available.`,
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
