import { Seat, CategoryId } from '../types/seating';

const LOWER_ROW_LIST = [
  'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M',
  'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A',
];
const UPPER_ROW_ORDER = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];

const LOWER_ROW_INDEX: Record<string, number> = {};
LOWER_ROW_LIST.forEach((r, i) => { LOWER_ROW_INDEX[r] = i; });
const UPPER_ROW_INDEX: Record<string, number> = {};
UPPER_ROW_ORDER.forEach((r, i) => { UPPER_ROW_INDEX[r] = i; });

export function generateDefaultSeats(): Seat[] {
  const seats: Seat[] = [];

  // ==========================================
  // 1. UPPER TIER (Balcony / Top Level) = 132 seats
  // Continuous Right-to-Left Seat Numbering (1 at rightmost to 27/24 at leftmost)
  // ==========================================

  // --- Row UB5 (24 seats): Right 7 (1-7), Center 10 (8-17), Left 7 (18-24) ---
  const ub5Y = 90 + UPPER_ROW_INDEX['UB5'] * 25;
  // Upper Right (cols 1-7: Accompanying)
  for (let c = 1; c <= 7; c++) {
    const id = `UB5-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_RIGHT',
      blockName: 'Upper Right Balcony',
      row: 'UB5',
      col: c,
      seatNumber: id,
      categoryId: 'accompanying',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
      x: 873 - (c - 1) * 28,
      y: ub5Y,
    });
  }
  // Upper Center (cols 8-17: Accompanying)
  for (let c = 8; c <= 17; c++) {
    const id = `UB5-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB5',
      col: c,
      seatNumber: id,
      categoryId: 'accompanying',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
      x: 614 - (c - 8) * 26,
      y: ub5Y,
    });
  }
  // Upper Left (cols 18-24: Nursing)
  for (let c = 18; c <= 24; c++) {
    const id = `UB5-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_LEFT',
      blockName: 'Upper Left Balcony',
      row: 'UB5',
      col: c,
      seatNumber: id,
      categoryId: 'nursing',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
      x: 258 - (c - 18) * 28,
      y: ub5Y,
    });
  }

  // --- Rows UB4, UB3, UB2, UB1 (4 rows x 27 seats = 108 seats) ---
  const standardBalconyRows = ['UB4', 'UB3', 'UB2', 'UB1'];
  standardBalconyRows.forEach((rName) => {
    const y = 90 + UPPER_ROW_INDEX[rName] * 25;

    // Upper Right (cols 1-7: Accompanying)
    for (let c = 1; c <= 7; c++) {
      const id = `${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_RIGHT',
        blockName: 'Upper Right Balcony',
        row: rName,
        col: c,
        seatNumber: id,
        categoryId: 'accompanying',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
        x: 873 - (c - 1) * 28,
        y,
      });
    }

    // Upper Center (cols 8-20: 13 seats)
    for (let c = 8; c <= 20; c++) {
      const id = `${rName}-${c}`;
      let cat: CategoryId = 'accompanying';
      if (rName === 'UB2') {
        cat = 'pg';
      } else if (rName === 'UB1') {
        if (c === 8) cat = 'accompanying';
        else if (c === 9 || c === 10) cat = 'pg';
        else cat = 'nursing';
      }

      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_CENTER',
        blockName: 'Upper Center Balcony',
        row: rName,
        col: c,
        seatNumber: id,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
        x: 626 - (c - 8) * 23,
        y,
      });
    }

    // Upper Left (cols 21-27: 7 seats: Nursing)
    for (let c = 21; c <= 27; c++) {
      const id = `${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_LEFT',
        blockName: 'Upper Left Balcony',
        row: rName,
        col: c,
        seatNumber: id,
        categoryId: 'nursing',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
        x: 258 - (c - 21) * 28,
        y,
      });
    }
  });

  // ==========================================
  // 2. LOWER TIER (Ground Floor) = 618 seats
  // Continuous Right-to-Left Seat Numbering:
  // - Row A: A1 (rightmost) to A10 (leftmost)
  // - Rows B-W: B1, C1.. (rightmost) to B27, C27.. (leftmost)
  // - Row X: X1 (rightmost) to X14 (leftmost)
  // ==========================================

  // --- Row A (10 seats): Right 5 (A1-A5 Blocked), Left 5 (A6-A10 Console) ---
  const rowAY = 300 + LOWER_ROW_INDEX['A'] * 26.5;
  for (let c = 1; c <= 5; c++) {
    const id = `A${c}`;
    seats.push({
      id,
      tier: 'LOWER',
      block: 'LOWER_RIGHT',
      blockName: 'Right Wing (Ground Floor)',
      row: 'A',
      col: c,
      seatNumber: id,
      categoryId: 'blocked',
      isBlocked: true,
      gateRecommendation: 'Gate-1',
      x: 817 - (c - 1) * 28,
      y: rowAY,
    });
  }
  for (let c = 6; c <= 10; c++) {
    const id = `A${c}`;
    seats.push({
      id,
      tier: 'LOWER',
      block: 'LOWER_LEFT',
      blockName: 'Left Wing (Ground Floor)',
      row: 'A',
      col: c,
      seatNumber: id,
      categoryId: 'console',
      isBlocked: false,
      gateRecommendation: 'Gate-2',
      x: 253 - (c - 6) * 28,
      y: rowAY,
    });
  }

  // --- Rows B through W (22 rows x 27 seats = 594 seats) ---
  const standardLowerRows = [
    'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W'
  ];

  standardLowerRows.forEach((rName) => {
    const y = 300 + LOWER_ROW_INDEX[rName] * 26.5;

    // Right Wing (cols 1-7: Accompanying)
    for (let c = 1; c <= 7; c++) {
      const id = `${rName}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_RIGHT',
        blockName: 'Right Wing (Ground Floor)',
        row: rName,
        col: c,
        seatNumber: id,
        categoryId: 'accompanying',
        isBlocked: false,
        gateRecommendation: 'Gate-1',
        x: 873 - (c - 1) * 28,
        y,
      });
    }

    // Center Block (cols 8-20: 13 seats)
    for (let c = 8; c <= 20; c++) {
      const id = `${rName}${c}`;
      let cat: CategoryId = 'faculty';
      if (rName === 'B') {
        cat = 'vvip';
      } else if (['C', 'D', 'E', 'F', 'G'].includes(rName)) {
        cat = 'vip';
      } else {
        cat = 'faculty';
      }

      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_CENTER',
        blockName: 'Center Block (Ground Floor)',
        row: rName,
        col: c,
        seatNumber: id,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: c <= 14 ? 'Gate-1' : 'Gate-2',
        x: 626 - (c - 8) * 23,
        y,
      });
    }

    // Left Wing (cols 21-27: 7 seats)
    for (let c = 21; c <= 27; c++) {
      const id = `${rName}${c}`;
      let cat: CategoryId = 'mbbs';
      if (rName === 'B') {
        cat = 'awardees';
      } else if (rName === 'C' || rName === 'D') {
        cat = 'it_staff';
      } else if (rName === 'V' || rName === 'W') {
        cat = 'nursing';
      } else {
        cat = 'mbbs';
      }

      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_LEFT',
        blockName: 'Left Wing (Ground Floor)',
        row: rName,
        col: c,
        seatNumber: id,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: 'Gate-2',
        x: 253 - (c - 21) * 28,
        y,
      });
    }
  });

  // --- Row X (14 seats): Right 7 (X1-X7 Accompanying), Left 7 (X8-X14 Nursing) ---
  const rowXY = 300 + LOWER_ROW_INDEX['X'] * 26.5;
  for (let c = 1; c <= 7; c++) {
    const id = `X${c}`;
    seats.push({
      id,
      tier: 'LOWER',
      block: 'LOWER_RIGHT',
      blockName: 'Right Wing (Ground Floor)',
      row: 'X',
      col: c,
      seatNumber: id,
      categoryId: 'accompanying',
      isBlocked: false,
      gateRecommendation: 'Gate-1',
      x: 873 - (c - 1) * 28,
      y: rowXY,
    });
  }
  for (let c = 8; c <= 14; c++) {
    const id = `X${c}`;
    seats.push({
      id,
      tier: 'LOWER',
      block: 'LOWER_LEFT',
      blockName: 'Left Wing (Ground Floor)',
      row: 'X',
      col: c,
      seatNumber: id,
      categoryId: 'nursing',
      isBlocked: false,
      gateRecommendation: 'Gate-2',
      x: 253 - (c - 8) * 28,
      y: rowXY,
    });
  }

  return seats;
}

export const INITIAL_QUESTIONNAIRE_ANSWERS = {
  eventTitle: 'Convocation Seating Arrangement (Auditorium, AIIMS Kalyani)',
  departmentName: 'Convocation Organizing Committee',
  numVip: 79,             // 65 Center Rows C-G + 14 Right Rows D-E buffer
  numSeniorFaculty: 13,   // 13 VVIP seats (Center Row B seats B8-B20)
  numFaculty: 145,        // 145 Faculty from SORTED FACULTY LIST
  numAwardees: 7,         // Left Row B (B21-B27)
  numReporters: 14,       // Right Rows B-C buffer
  numAccompanying: 296,   // 296 Accompanying Guests / Parents from Student Forms
  numBandParty: 14,       // 14 IT Dept Staff (Left Rows C-D)
  numConsole: 5,          // 5 Console (Left Row A seats A6-A10)
  numBlocked: 5,          // 5 Blocked seats (Right Row A seats A1-A5)
  numAudience: 169,       // 109 MBBS + 45 Nursing + 15 PG
  totalSeats: 750,
  notes: 'Official AIIMS Kalyani Convocation Master Blueprint with Authoritative Roster',
};
