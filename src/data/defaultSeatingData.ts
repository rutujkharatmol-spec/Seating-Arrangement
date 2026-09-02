import { Seat, BlockType, TierType, CategoryId } from '../types/seating';

export function generateDefaultSeats(): Seat[] {
  const seats: Seat[] = [];

  // ==========================================
  // 1. UPPER TIER (Balcony / Top Level)
  // Total Seats = 132
  // ==========================================

  // --- Upper Left Block (5 rows x 7 cols = 35 seats) ---
  // UB1 (7 seats): Nursing
  // UB2 (7 seats): Nursing
  // UB3: cols 1-5 (5 seats) Nursing, cols 6-7 (2 seats) PG Residents
  // UB4 (7 seats): PG Residents
  // UB5 (7 seats): PG Residents
  const upperLeftRows = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
  upperLeftRows.forEach((rName) => {
    for (let c = 1; c <= 7; c++) {
      let cat: CategoryId = 'nursing';
      if (rName === 'UB1' || rName === 'UB2') {
        cat = 'nursing';
      } else if (rName === 'UB3') {
        cat = c <= 5 ? 'nursing' : 'pg';
      } else if (rName === 'UB4' || rName === 'UB5') {
        cat = 'pg';
      }

      const id = `UL-${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_LEFT',
        blockName: 'Upper Left Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // --- Upper Center Block (62 seats) ---
  // Row UB5 (Topmost): 10 seats -> PDCC & Post-Doctoral Fellows
  for (let c = 1; c <= 10; c++) {
    const id = `UC-UB5-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB5',
      col: c,
      seatNumber: `UB5-${c}`,
      categoryId: 'pdcc',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // Row UB4: 13 seats (cols 1-3: PG Residents [completing 19 PG], cols 4-13: PDCC & Fellows)
  for (let c = 1; c <= 13; c++) {
    const id = `UC-UB4-${c}`;
    const cat: CategoryId = c <= 3 ? 'pg' : 'pdcc';
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB4',
      col: c,
      seatNumber: `UB4-${c}`,
      categoryId: cat,
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // Rows UB3, UB2, UB1: 3 rows x 13 cols = 39 seats -> Band Party & Orchestra
  ['UB3', 'UB2', 'UB1'].forEach((rName) => {
    for (let c = 1; c <= 13; c++) {
      const id = `UC-${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_CENTER',
        blockName: 'Upper Center Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'band_party',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // --- Upper Right Block (5 rows x 7 cols = 35 seats: Parents & Family Guests) ---
  const upperRightRows = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
  upperRightRows.forEach((rName) => {
    for (let c = 1; c <= 7; c++) {
      const id = `UR-${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_RIGHT',
        blockName: 'Upper Right Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'accompanying',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // ==========================================
  // 2. LOWER TIER (Main Floor)
  // Rows A (Front) to X (Back)
  // Total Seats = 618
  // ==========================================

  const lowerRows = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X'
  ];

  // --- LOWER LEFT WING (166 seats) ---
  // Order: MBBS on front seats, then Nursing, then PG, then PDCC
  // - Rows A-Q (117 seats) + Row R cols 1-2 (2 seats) = 119 seats -> MBBS Graduates
  // - Row R cols 3-7 (5 seats) + Rows S-X (42 seats) = 47 seats -> Nursing Graduates
  lowerRows.forEach((rowLetter) => {
    const startCol = rowLetter === 'A' ? 3 : 1;
    for (let c = startCol; c <= 7; c++) {
      let cat: CategoryId = 'mbbs';
      if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'].includes(rowLetter)) {
        cat = 'mbbs';
      } else if (rowLetter === 'R') {
        cat = c <= 2 ? 'mbbs' : 'nursing';
      } else {
        cat = 'nursing';
      }

      const id = `L-${rowLetter}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_LEFT',
        blockName: 'Left Wing (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: 'Gate-2',
      });
    }
  });

  // --- LOWER CENTER BLOCK (299 seats) ---
  // - Rows A-D (4 rows x 13 cols = 52 seats) -> VIP & Dignitaries
  // - Rows E-G (3 rows x 13 cols = 39 seats) -> Media & Press Reporters
  // - Rows H-W (16 rows x 13 cols = 208 seats) -> Faculty Members & Academic Leaders
  const centerRows = [
    'A', 'B', 'C', 'D',
    'E', 'F', 'G',
    'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'
  ];

  centerRows.forEach((rowLetter) => {
    let cat: CategoryId = 'faculty';
    if (['A', 'B', 'C', 'D'].includes(rowLetter)) {
      cat = 'vip';
    } else if (['E', 'F', 'G'].includes(rowLetter)) {
      cat = 'reporters';
    } else {
      cat = 'faculty';
    }

    for (let c = 1; c <= 13; c++) {
      const id = `C-${rowLetter}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_CENTER',
        blockName: 'Center Block (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: cat === 'vip' || cat === 'reporters' ? 'Gate-2' : 'Gate-1',
      });
    }
  });

  // --- LOWER RIGHT WING (166 seats) ---
  // - ALL Rows A-X (166 seats) -> Parents & Guardians (Accompanying Persons)
  lowerRows.forEach((rowLetter) => {
    const endCol = rowLetter === 'A' ? 5 : 7;
    for (let c = 1; c <= endCol; c++) {
      const id = `R-${rowLetter}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_RIGHT',
        blockName: 'Right Wing (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: 'accompanying',
        isBlocked: false,
        gateRecommendation: 'Gate-1',
      });
    }
  });

  return seats;
}

export const INITIAL_QUESTIONNAIRE_ANSWERS = {
  eventTitle: 'Convocation Seating Arrangement (Auditorium, AIIMS Kalyani)',
  departmentName: 'Convocation Organizing Committee',
  numVip: 52,             // 4 rows x 13 = 52 VIP seats (Rows A, B, C, D Center)
  numSeniorFaculty: 30,
  numFaculty: 208,        // Rows H-W Center
  numAwardees: 35,
  numReporters: 39,       // Rows E-G Center
  numAccompanying: 201,   // 166 Right Ground Floor + 35 Upper Right Balcony (Parents & Guardians)
  numBandParty: 39,       // Rows UB1-UB3 Upper Center
  numConsole: 25,
  numBlocked: 0,
  numAudience: 204,       // 119 MBBS + 66 Nursing + 19 PG Residents on Left Side
  totalSeats: 763,
  notes: 'Official AIIMS Kalyani Convocation Blueprint: Left Side (MBBS -> Nursing -> PG -> PDCC), Middle (VIP & Reporters), Right Side (Parents)',
};
