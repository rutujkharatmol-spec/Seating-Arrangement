import { Seat, CategoryId, BlockType, TierType } from '../types/seating';

/**
 * AIIMS Kalyani auditorium — 750 seats.
 *
 * Geometry is fixed: the balcony runs UB1 (front railing) to UB6 (back), 132
 * seats; the ground floor runs row A (by the stage) to row X (back), 600 seats.
 * Rows A and X have wing seats only, so the middle block runs from B to W.
 * Seat numbers run continuously right-to-left along each row.
 *
 * Which section each seat belongs to is decided separately, by
 * assignConvocationZones, so the built-in plan, the Auto-Arrange tool and the
 * layout migration all share one set of rules.
 */

/**
 * Bump whenever the zone rules change. Any saved plan (cloud, snapshot or
 * browser cache) carrying an older version is moved onto the new layout once.
 */
export const CONVOCATION_LAYOUT_VERSION = 'convocation-2026-09-13-faculty-from-row-d';

const LOWER_ROW_LIST = [
  'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M',
  'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A',
];
const UPPER_ROW_ORDER = ['UB6', 'UB5', 'UB4', 'UB3', 'UB2', 'UB1'];

const LOWER_ROW_INDEX: Record<string, number> = {};
LOWER_ROW_LIST.forEach((r, i) => { LOWER_ROW_INDEX[r] = i; });
const UPPER_ROW_INDEX: Record<string, number> = {};
UPPER_ROW_ORDER.forEach((r, i) => { UPPER_ROW_INDEX[r] = i; });

/** Ground-floor rows from the stage backwards. */
const FRONT_TO_BACK = [...LOWER_ROW_LIST].reverse();

const BLOCK_NAMES: Record<BlockType, string> = {
  UPPER_RIGHT: 'Upper Right Balcony',
  UPPER_CENTER: 'Upper Center Balcony',
  UPPER_LEFT: 'Upper Left Balcony',
  LOWER_RIGHT: 'Right Wing (Ground Floor)',
  LOWER_CENTER: 'Center Block (Ground Floor)',
  LOWER_LEFT: 'Left Wing (Ground Floor)',
  EXAM_HALL: 'Exam Section Hall',
};

function makeSeat(
  tier: TierType,
  block: BlockType,
  row: string,
  col: number,
  id: string,
  gateRecommendation: Seat['gateRecommendation'],
  x: number,
  y: number
): Seat {
  return {
    id,
    tier,
    block,
    blockName: BLOCK_NAMES[block],
    row,
    col,
    seatNumber: id,
    categoryId: 'available',
    isBlocked: false,
    gateRecommendation,
    x,
    y,
  };
}

/** Every seat with its position and entry gate, before any section is set. */
function buildSeatGeometry(): Seat[] {
  const seats: Seat[] = [];

  // --- Balcony (132 seats):
  //   UB6 (back wall)  4 seats  =      4      (centre only, c11–14)
  //   UB5             20 seats  = 7 +  6 + 7  (short centre row, c10–15)
  //   UB4–UB1         27 seats  = 7 + 13 + 7
  for (const row of UPPER_ROW_ORDER) {
    const y = 90 + UPPER_ROW_INDEX[row] * 25;
    const isBackRow = row === 'UB5' || row === 'UB6';

    // The back centre row stands on its own, with no wing seats beside it.
    if (row === 'UB6') {
      for (let c = 11; c <= 14; c++) {
        seats.push(makeSeat('UPPER', 'UPPER_CENTER', row, c, `${row}-${c}`, 'Balcony Gate', 614 - (c - 8) * 26, y));
      }
      continue;
    }

    const centreStart = row === 'UB5' ? 10 : 8;
    const centreEnd = row === 'UB5' ? 15 : 20;
    const leftStart = row === 'UB5' ? 18 : 21;

    for (let c = 1; c <= 7; c++) {
      seats.push(makeSeat('UPPER', 'UPPER_RIGHT', row, c, `${row}-${c}`, 'Balcony Gate', 873 - (c - 1) * 28, y));
    }
    for (let c = centreStart; c <= centreEnd; c++) {
      const x = isBackRow ? 614 - (c - 8) * 26 : 626 - (c - 8) * 23;
      seats.push(makeSeat('UPPER', 'UPPER_CENTER', row, c, `${row}-${c}`, 'Balcony Gate', x, y));
    }
    for (let c = leftStart; c <= leftStart + 6; c++) {
      seats.push(makeSeat('UPPER', 'UPPER_LEFT', row, c, `${row}-${c}`, 'Balcony Gate', 258 - (c - leftStart) * 28, y));
    }
  }

  // --- Row A: wings only, 5 + 5 seats, plus 2 wheelchair spaces (A11–A12)
  //     added at the far left corner, beside the Gate-2 aisle ---
  const rowAY = 300 + LOWER_ROW_INDEX['A'] * 26.5;
  for (let c = 1; c <= 5; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_RIGHT', 'A', c, `A${c}`, 'Gate-1', 817 - (c - 1) * 28, rowAY));
  }
  for (let c = 6; c <= 12; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_LEFT', 'A', c, `A${c}`, 'Gate-2', 253 - (c - 6) * 28, rowAY));
  }

  // --- Rows B–W ---
  for (const row of FRONT_TO_BACK.slice(1, -1)) {
    const y = 300 + LOWER_ROW_INDEX[row] * 26.5;

    // Right wing: 7 seats (c=1..7), except Row P, which is one seat short at the
    // outer wall. Row P's remaining seats are numbered P1–P6 with no gap, but
    // they keep the positions they physically occupy, so the missing space is
    // still at the wall end of the row.
    const rightCols = row === 'P' ? 6 : 7;
    for (let c = 1; c <= rightCols; c++) {
      const x = row === 'P' ? 873 - c * 28 : 873 - (c - 1) * 28;
      seats.push(makeSeat('LOWER', 'LOWER_RIGHT', row, c, `${row}${c}`, 'Gate-1', x, y));
    }

    // Center block: 13 seats (c=8..20) on every row.
    for (let c = 8; c <= 20; c++) {
      const gate = c <= 14 ? 'Gate-1' : 'Gate-2';
      seats.push(makeSeat('LOWER', 'LOWER_CENTER', row, c, `${row}${c}`, gate, 626 - (c - 8) * 23, y));
    }

    // Left wing: 7 seats (c=21..27), except Row P, which is one seat short at the wall (c=21..26)
    const leftColEnd = row === 'P' ? 26 : 27;
    for (let c = 21; c <= leftColEnd; c++) {
      seats.push(makeSeat('LOWER', 'LOWER_LEFT', row, c, `${row}${c}`, 'Gate-2', 253 - (c - 21) * 28, y));
    }
  }

  // --- Row X: wings only, 7 + 7 = 14 seats ---
  const rowXY = 300 + LOWER_ROW_INDEX['X'] * 26.5;
  for (let c = 1; c <= 7; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_RIGHT', 'X', c, `X${c}`, 'Gate-1', 873 - (c - 1) * 28, rowXY));
  }
  for (let c = 8; c <= 14; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_LEFT', 'X', c, `X${c}`, 'Gate-2', 253 - (c - 8) * 28, rowXY));
  }

  return seats;
}

/**
 * Head counts that decide where the variable boundaries fall. Everything else
 * in the layout is a fixed number of rows.
 */
export interface ZoneCounts {
  /** Faculty: the middle block gets enough rows, after the VIP rows. */
  faculty: number;
  /** Nursing students: this many seats from Left Wing back + Center back. */
  nursing: number;
  /** MBBS students: left wing rows (split around the IT staff rows). */
  mbbs: number;
}

/** From the organising committee's summary sheet (PDF). */
export const DEFAULT_ZONE_COUNTS: ZoneCounts = {
  faculty: 195,  // Center rows D–R (15×13 = 195 seats)
  nursing: 41,   // Left U–X (28) + Center W (13) = 41 capacity, 4 rank holders moved to awardees
  mbbs: 105,     // Left rows C–I and M–T (104 capacity), 3 rank holders moved to awardees
};

/** One run of seats inside a block, filled front row to back row. */
interface ZoneSegment {
  categoryId: CategoryId;
  seats: number;
}

/**
 * Exact seat counts taken from the committee's chart adjusted for:
 * - Right Wing Row P one seat short at the wall, renumbered P1–P6 (capacity 165)
 * - P27 deleted from Left Wing, 2 wheelchair spaces added at the Row A corner (capacity 167)
 * - Middle block full 13-seat rows B–W (capacity 286)
 * - Balcony rows UB5 (6 centre seats) and UB6 (4 centre seats) (capacity 132)
 * Auditorium capacity = 165 + 286 + 167 + 132 = 750 seats (+ 100 in Exam Section Hall = 850 total).
 */
const LEFT_WING_PLAN: ZoneSegment[] = [
  { categoryId: 'guide', seats: 5 },      // Row A, aisle side (A6–A10)
  { categoryId: 'accessible', seats: 2 }, // Row A outer corner — A11, A12 wheelchair spaces
  { categoryId: 'awardees', seats: 7 },   // Row B — rank holders, front row of the left wing
  { categoryId: 'mbbs', seats: 49 },      // Rows C–I
  { categoryId: 'it_staff', seats: 21 },  // Rows J–L
  { categoryId: 'mbbs', seats: 55 },      // Rows M–T (P has 6 instead of 7)
  { categoryId: 'nursing', seats: 28 },   // Rows U–X
];

const MIDDLE_BLOCK_PLAN: ZoneSegment[] = [
  { categoryId: 'vip', seats: 26 },       // Rows B–C — dignitaries, deans and registrar
  { categoryId: 'faculty', seats: 195 },  // Rows D–R
  { categoryId: 'available', seats: 37 }, // Rows S–T, then 11 of row U
  { categoryId: 'pg', seats: 15 },        // Last 2 of row U + row V — right in front of nursing
  { categoryId: 'nursing', seats: 13 },   // Row W
];

const RIGHT_WING_PLAN: ZoneSegment[] = [
  { categoryId: 'reporters', seats: 26 },      // Rows A–D
  { categoryId: 'admin_staff', seats: 30 },    // Rows E–H, then 2 seats of row I
  { categoryId: 'accompanying', seats: 109 },  // Rest of row I, then rows J–X (Row P has 6 seats: P1–P6)
];

/** The whole balcony is parents, so it needs no segment plan (132 seats). */

/**
 * The convocation seating rules, as seat counts rather than whole rows:
 *
 * - Balcony: parents (132).
 * - Right wing: reporters 26, admin 30, parents 109.
 * - Middle block: VIP 26, faculty 195, blank 37, PG 15, nursing 13
 *   (PG sits immediately in front of nursing, with no gap between them).
 * - Left wing: guide 5, wheelchair 2, awardees 7, MBBS 49, IT staff 21, MBBS 55,
 *   nursing 28.
 */
export function assignConvocationZones(seats: Seat[], _counts: ZoneCounts = DEFAULT_ZONE_COUNTS): Seat[] {
  const zoneBySeat = new Map<string, CategoryId>();

  const fillBlock = (block: BlockType, plan: ZoneSegment[]) => {
    const ordered = seats
      .filter((s) => s.block === block)
      .sort((a, b) => {
        const rowDiff = FRONT_TO_BACK.indexOf(a.row) - FRONT_TO_BACK.indexOf(b.row);
        return rowDiff !== 0 ? rowDiff : a.col - b.col;
      });

    let i = 0;
    for (const segment of plan) {
      for (let n = 0; n < segment.seats && i < ordered.length; n++, i++) {
        zoneBySeat.set(ordered[i].id, segment.categoryId);
      }
    }
    // Any seat the plan doesn't reach stays 'available'.
  };

  fillBlock('LOWER_LEFT', LEFT_WING_PLAN);
  fillBlock('LOWER_CENTER', MIDDLE_BLOCK_PLAN);
  fillBlock('LOWER_RIGHT', RIGHT_WING_PLAN);

  return seats.map((s) => ({
    ...s,
    categoryId:
      s.tier === 'EXAM_HALL'
        ? 'accompanying'
        : s.tier === 'UPPER'
        ? 'accompanying'
        : zoneBySeat.get(s.id) ?? 'available',
    isBlocked: false,
  }));
}

/**
 * 10 by 10 seats Exam Section Hall — 100 seats (Rows A–J, Cols 1–10).
 * Dedicated overflow hall specifically designated for parents and accompanying guests.
 */
export const EXAM_HALL_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function buildExamHallSeatGeometry(): Seat[] {
  const seats: Seat[] = [];

  EXAM_HALL_ROWS.forEach((row, rIdx) => {
    // Rows start at y=250 and step by 62px downwards
    const y = 250 + rIdx * 62;
    for (let col = 1; col <= 10; col++) {
      // 5 seats on left (x: 210..434), 100px wide center aisle, 5 seats on right (x: 550..774)
      const x = col <= 5 ? 210 + (col - 1) * 56 : 550 + (col - 6) * 56;
      const id = `EH-${row}${col}`;
      seats.push({
        id,
        tier: 'EXAM_HALL',
        block: 'EXAM_HALL',
        blockName: 'Exam Section Hall',
        row,
        col,
        seatNumber: id,
        categoryId: 'accompanying',
        isBlocked: false,
        gateRecommendation: 'Exam Hall Gate',
        x,
        y,
      });
    }
  });

  return seats;
}

export function generateDefaultSeats(): Seat[] {
  const auditoriumSeats = assignConvocationZones(buildSeatGeometry());
  const examHallSeats = buildExamHallSeatGeometry();
  return [...auditoriumSeats, ...examHallSeats];
}

export const INITIAL_QUESTIONNAIRE_ANSWERS = {
  eventTitle: 'Convocation Seating Arrangement (Auditorium & Exam Hall, AIIMS Kalyani)',
  departmentName: 'Convocation Organizing Committee',
  numVip: 26,             // Center rows B–C
  numSeniorFaculty: 0,
  numFaculty: 195,        // Center rows D–R
  numAwardees: 7,       // Left wing Row B — rank holders & best outgoing students
  numReporters: 26,       // Right rows A–D
  numAccompanying: 341,   // Balcony (132) + Right rows I–X (109) + Exam Section Hall (100)
  numBandParty: 0,
  numConsole: 0,
  numBlocked: 0,
  numAudience: 280,       // Admin(30), IT staff(21), MBBS(104), nursing(41), PG(15), guide(5), awardees(7), wheelchair(2), blank(37)
  totalSeats: 850,        // Main Auditorium (750) + Exam Section Hall (100)
  notes: 'AIIMS Kalyani Convocation layout: Main Auditorium (750 seats, Balcony: 132 seats) + Exam Section Hall (100 seats: 10x10 for overflow parents), VIP and visiting dignitaries in center rows B–C, faculty in center rows D–R, reporters in right rows A–D, admin in right mid-front, IT staff in left middle, MBBS in left (split around IT), nursing in left back + center back, PG in center rows U–V, guides in left row A, rank holders in left row B.',
};

