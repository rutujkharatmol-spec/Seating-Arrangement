import { Seat, BlockType, TierType, CategoryId } from '../types/seating';

export function generateDefaultSeats(): Seat[] {
  const seats: Seat[] = [];

  // ==========================================
  // 1. UPPER TIER (Balcony / Top Level)
  // Total Seats = 132
  // ==========================================

  // --- Upper Left Block (5 rows x 7 cols = 35 seats) ---
  // Rows UB1-UB5: All 35 seats -> Nursing Graduates
  const upperLeftRows = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
  upperLeftRows.forEach((rName) => {
    for (let c = 1; c <= 7; c++) {
      const id = `UL-${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_LEFT',
        blockName: 'Upper Left Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'nursing',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // --- Upper Center Block (62 seats) ---
  // - Row UB5 (10 seats): PDCC & Post-Doctoral Fellows
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

  // - Row UB4 (13 seats): PDCC & Post-Doctoral Fellows
  for (let c = 1; c <= 13; c++) {
    const id = `UC-UB4-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB4',
      col: c,
      seatNumber: `UB4-${c}`,
      categoryId: 'pdcc',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // - Row UB3 (13 seats): PDCC & Post-Doctoral Fellows
  for (let c = 1; c <= 13; c++) {
    const id = `UC-UB3-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB3',
      col: c,
      seatNumber: `UB3-${c}`,
      categoryId: 'pdcc',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // - Row UB2 (13 seats): PG Residents
  for (let c = 1; c <= 13; c++) {
    const id = `UC-UB2-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB2',
      col: c,
      seatNumber: `UB2-${c}`,
      categoryId: 'pg',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // - Row UB1 (13 seats): cols 1-10 Nursing Graduates (10 seats), cols 11-13 PG Residents (3 seats)
  for (let c = 1; c <= 13; c++) {
    const id = `UC-UB1-${c}`;
    const cat: CategoryId = c <= 10 ? 'nursing' : 'pg';
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB1',
      col: c,
      seatNumber: `UB1-${c}`,
      categoryId: cat,
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

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
  // Total Seats = 631
  // ==========================================

  const lowerRows = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X'
  ];

  // --- LOWER LEFT WING (166 seats) ---
  // - Row A cols 3-7 (5 seats) -> AV & Technical Console
  // - Row B cols 1-7 (7 seats) -> Awardees & Medalists
  // - Rows C & D cols 1-7 (14 seats) -> IT Dept Staff
  // - Rows E through U (17 rows x 7 cols = 119 seats) -> MBBS Graduates
  // - Rows V, W, X (3 rows x 7 cols = 21 seats) -> Nursing Graduates
  lowerRows.forEach((rowLetter) => {
    const startCol = rowLetter === 'A' ? 3 : 1;
    for (let c = startCol; c <= 7; c++) {
      let cat: CategoryId = 'mbbs';
      if (rowLetter === 'A') {
        cat = 'console';
      } else if (rowLetter === 'B') {
        cat = 'awardees';
      } else if (rowLetter === 'C' || rowLetter === 'D') {
        cat = 'it_staff';
      } else if (['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'].includes(rowLetter)) {
        cat = 'mbbs';
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
  // - Rows A-B (2 rows x 13 cols = 26 seats) -> VVIP Dignitaries
  // - Rows C-G (5 rows x 13 cols = 65 seats) -> VIP & Dignitaries
  // - Rows H-W (16 rows x 13 cols = 208 seats) -> Faculty Members & Academic Staff
  const centerRows = [
    'A', 'B',
    'C', 'D', 'E', 'F', 'G',
    'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'
  ];

  centerRows.forEach((rowLetter) => {
    let cat: CategoryId = 'faculty';
    if (rowLetter === 'A' || rowLetter === 'B') {
      cat = 'vvip';
    } else if (['C', 'D', 'E', 'F', 'G'].includes(rowLetter)) {
      cat = 'vip';
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
        gateRecommendation: c <= 6 ? 'Gate-2' : 'Gate-1',
      });
    }
  });

  // --- LOWER RIGHT WING (166 seats) ---
  // - Row A cols 1-5 (5 seats) -> Blocked Seats (camera/stage buffer)
  // - Rows B-C cols 1-7 (14 seats) -> Media & Press Reporters
  // - Rows D-E cols 1-7 (14 seats) -> VIP & Dignitaries
  // - Rows F-H cols 1-7 (21 seats) -> Administrative Staff
  // - Rows I through X cols 1-7 (16 rows x 7 cols = 112 seats) -> Parents & Guardians
  lowerRows.forEach((rowLetter) => {
    const endCol = rowLetter === 'A' ? 5 : 7;
    for (let c = 1; c <= endCol; c++) {
      let cat: CategoryId = 'accompanying';
      if (rowLetter === 'A') {
        cat = 'blocked';
      } else if (rowLetter === 'B' || rowLetter === 'C') {
        cat = 'reporters';
      } else if (rowLetter === 'D' || rowLetter === 'E') {
        cat = 'vip';
      } else if (rowLetter === 'F' || rowLetter === 'G' || rowLetter === 'H') {
        cat = 'admin_staff';
      } else {
        cat = 'accompanying';
      }

      const id = `R-${rowLetter}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_RIGHT',
        blockName: 'Right Wing (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked: cat === 'blocked',
        gateRecommendation: 'Gate-1',
      });
    }
  });

  return seats;
}

export const INITIAL_QUESTIONNAIRE_ANSWERS = {
  eventTitle: 'Convocation Seating Arrangement (Auditorium, AIIMS Kalyani)',
  departmentName: 'Convocation Organizing Committee',
  numVip: 79,             // 65 Center Rows C-G + 14 Right Rows D-E
  numSeniorFaculty: 26,   // 26 VVIP seats (Center Rows A-B)
  numFaculty: 208,        // Rows H-W Center
  numAwardees: 7,         // Left Row B
  numReporters: 14,       // Right Rows B-C
  numAccompanying: 147,   // 112 Right Rows I-X + 35 Upper Right Balcony (Parents & Guardians)
  numBandParty: 14,       // 14 IT Dept Staff (Left Rows C-D)
  numConsole: 5,          // 5 Console (Left Row A)
  numBlocked: 5,          // 5 Blocked seats (Right Row A cols 1-5)
  numAudience: 258,       // 119 MBBS + 66 Nursing + 36 PDCC + 16 PG + 21 Admin Staff
  totalSeats: 763,
  notes: 'Official AIIMS Kalyani Convocation Master Blueprint',
};
