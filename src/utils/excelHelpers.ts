import * as XLSX from 'xlsx';
import { Attendee, CategoryId, Seat } from '../types/seating';
import { CATEGORIES } from '../data/categories';

export interface SheetParseResult {
  sheetName: string;
  totalRows: number;
  attendees: Attendee[];
  headers: string[];
}

export interface SpreadsheetParseResult {
  fileName: string;
  fileSize: number;
  sheets: SheetParseResult[];
  allAttendees: Attendee[];
}

/**
 * Format ALL-CAPS names into clean Title Case while preserving acronyms/degrees
 */
export function titleCase(str: string): string {
  if (!str) return '';
  const parts = String(str).trim().split(/\s+/);
  return parts
    .map((p) => {
      const upper = p.toUpperCase();
      if (['MBBS', 'MD', 'MS', 'MDS', 'ENT', 'AIIMS', 'II', 'III', 'IV', 'KP', 'P', 'B.'].includes(upper)) {
        return upper === 'B.' ? 'B.' : upper;
      }
      if (['and', '&', 'of', 'in', 'the'].includes(p.toLowerCase())) {
        return p.toLowerCase();
      }
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(' ');
}

export function extractEmail(str: string): string {
  if (!str) return '';
  const match = String(str).match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/i);
  return match ? match[0].trim() : String(str).trim();
}

/**
 * Normalize and map category string to valid CategoryId
 */
export function mapToCategoryId(catStr: string): CategoryId {
  if (!catStr) return 'faculty';
  const clean = catStr.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (CATEGORIES[clean]) return clean;

  if (clean.includes('vip') || clean.includes('dignitar')) return 'vip';
  if (clean.includes('media') || clean.includes('press') || clean.includes('reporter')) return 'reporters';
  if (clean.includes('mbbs')) return 'mbbs';
  if (clean.includes('nurs')) return 'nursing';
  if (clean.includes('pdcc') || clean.includes('fellow') || clean.includes('pg') || clean.includes('md') || clean.includes('ms') || clean.includes('mds') || clean.includes('resident')) return 'pg';
  if (clean.includes('parent') || clean.includes('accompany') || clean.includes('family') || clean.includes('guardian')) return 'accompanying';
  if (clean.includes('faculty') || clean.includes('prof') || clean.includes('doctor') || clean.includes('teacher')) return 'faculty';
  if (clean.includes('senior') || clean.includes('registrar')) return 'faculty';
  if (clean.includes('admin')) return 'admin_staff';
  if (clean.includes('it') || clean.includes('console') || clean.includes('av') || clean.includes('tech')) return 'it_staff';
  if (clean.includes('guide') || clean.includes('usher')) return 'guide';
  if (clean.includes('student')) return 'mbbs';

  return 'faculty';
}

/**
 * Parse an Excel (.xlsx, .xls) or CSV file in the browser
 */
export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });

  const sheetResults: SheetParseResult[] = [];
  const globalAttendees: Attendee[] = [];

  for (const sheetName of workbook.SheetNames) {
    // Skip empty or summary metadata sheets if not containing attendee rows
    if (['summary', 'sheet2', 'metadata'].includes(sheetName.toLowerCase().trim())) {
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    const sheetAttendees: Attendee[] = [];
    let detectedHeaders: string[] = [];
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};
    let currentSubBatch = '';

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r].map((c) => (c !== null && c !== undefined ? String(c).trim() : ''));
      if (row.every((c) => !c)) continue;

      // Detect sub-batch section headers like "2023" or "2024"
      const nonEmpties = row.filter((c) => c);
      if (nonEmpties.length === 1 && /^(19|20)\d{2}/.test(nonEmpties[0])) {
        currentSubBatch = nonEmpties[0];
        headerRowIdx = -1;
        continue;
      }

      // Check if this row looks like a header row
      const lowerCells = row.map((c) => c.toLowerCase());
      const hasName = lowerCells.some((c) => c.includes('name'));
      const hasSlOrEnroll = lowerCells.some(
        (c) => c.includes('sl') || c.includes('enroll') || c.includes('enrol') || c.includes('roll')
      );

      if (hasName || (hasSlOrEnroll && lowerCells.length >= 2)) {
        headerRowIdx = r;
        detectedHeaders = row.filter((c) => c);
        colMap = {};

        lowerCells.forEach((cell, cIdx) => {
          if (!cell) return;
          if (cell.includes('name') && colMap.name === undefined) colMap.name = cIdx;
          else if (
            (cell.includes('enroll') || cell.includes('enrol') || cell.includes('roll') || cell.includes('reg')) &&
            colMap.enroll === undefined
          )
            colMap.enroll = cIdx;
          else if (
            (cell.includes('dept') || cell.includes('department') || cell.includes('course') || cell.includes('discipline')) &&
            colMap.dept === undefined
          )
            colMap.dept = cIdx;
          else if (
            (cell.includes('designation') || cell.includes('title') || cell.includes('role') || cell.includes('post')) &&
            colMap.title === undefined
          )
            colMap.title = cIdx;
          else if (
            (cell.includes('mobile') || cell.includes('phone') || cell.includes('contact')) &&
            colMap.phone === undefined
          )
            colMap.phone = cIdx;
          else if (cell.includes('email') && colMap.email === undefined) colMap.email = cIdx;
          else if ((cell.includes('seat') || cell.includes('chair')) && colMap.seat === undefined) colMap.seat = cIdx;
          else if ((cell.includes('category') || cell.includes('zone')) && colMap.category === undefined)
            colMap.category = cIdx;
          else if (
            (cell.includes('institution') || cell.includes('inst') || cell.includes('org')) &&
            colMap.institution === undefined
          )
            colMap.institution = cIdx;
        });

        // Scan subsequent sample rows to auto-detect unlabelled email/phone/enrollment columns
        for (let nextR = r + 1; nextR < Math.min(rawRows.length, r + 6); nextR++) {
          const sampleRow = rawRows[nextR].map((c) => (c !== null && c !== undefined ? String(c).trim() : ''));
          sampleRow.forEach((val, cIdx) => {
            if (!val) return;
            if (colMap.email === undefined && /[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(val)) {
              colMap.email = cIdx;
            }
            if (colMap.phone === undefined && /^[6-9]\d{9}$/.test(val.replace(/[^0-9]/g, ''))) {
              colMap.phone = cIdx;
            }
            if (
              colMap.enroll === undefined &&
              /^(19|20)\d{6,8}$/.test(val.replace(/[^0-9]/g, '')) &&
              cIdx !== colMap.phone
            ) {
              colMap.enroll = cIdx;
            }
          });
        }
        continue;
      }

      // If we haven't found a header yet, skip or use default first column as name if plausible
      if (headerRowIdx === -1) {
        if (colMap.name === undefined && row.length > 0 && isNaN(Number(row[0]))) {
          colMap.name = 0;
        } else {
          continue;
        }
      }

      const rawName = colMap.name !== undefined ? row[colMap.name] : '';
      if (!rawName || rawName.toLowerCase() === 'name' || rawName.toLowerCase() === 'total') continue;

      const rawEnroll = colMap.enroll !== undefined ? row[colMap.enroll] : '';
      const rawDept = colMap.dept !== undefined ? row[colMap.dept] : '';
      const rawTitle = colMap.title !== undefined ? row[colMap.title] : '';
      const rawPhone = colMap.phone !== undefined ? row[colMap.phone] : '';
      const rawEmail = colMap.email !== undefined ? row[colMap.email] : '';
      const rawSeat = colMap.seat !== undefined ? row[colMap.seat] : '';
      const rawCat = colMap.category !== undefined ? row[colMap.category] : '';
      const rawInst = colMap.institution !== undefined ? row[colMap.institution] : '';

      // Format name
      let formattedName = rawName;
      if (rawName === rawName.toUpperCase() && rawName.length > 3) {
        formattedName = titleCase(rawName);
      }

      // Infer designation and department
      let inferredDept = rawDept || (currentSubBatch ? `${sheetName} (Batch ${currentSubBatch})` : sheetName);
      let inferredDesignation = rawTitle || 'Student / Graduate';
      const sLower = sheetName.toLowerCase();
      if (sLower.includes('mbbs')) inferredDesignation = rawTitle || 'MBBS Graduate';
      else if (sLower.includes('md') || sLower.includes('ms')) inferredDesignation = rawTitle || 'MD/MS/MDS Resident';
      else if (sLower.includes('b.sc') || sLower.includes('bsc')) inferredDesignation = rawTitle || 'B.Sc Nursing Graduate';
      else if (sLower.includes('m.sc') || sLower.includes('msc')) inferredDesignation = rawTitle || 'M.Sc Nursing Graduate';

      const cleanEnroll = rawEnroll ? String(rawEnroll).replace(/[^a-zA-Z0-9]/g, '') : '';
      const cleanPhone = rawPhone ? String(rawPhone).replace(/[^0-9+]/g, '') : '';
      const cleanEmail = extractEmail(rawEmail);

      const attendeeId = cleanEnroll
        ? `att-${sLower.replace(/[^a-z0-9]/g, '')}-${cleanEnroll}`
        : `att-${Date.now()}-${globalAttendees.length + sheetAttendees.length + 1}`;

      const notesParts: string[] = [];
      if (cleanEnroll) notesParts.push(`Enrollment No: ${cleanEnroll}`);
      if (currentSubBatch) notesParts.push(`Batch: ${currentSubBatch}`);

      const attendee: Attendee = {
        id: attendeeId,
        name: formattedName,
        title: formattedName.startsWith('Dr.') ? 'Dr.' : '',
        designation: inferredDesignation,
        department: inferredDept,
        institution: rawInst || 'AIIMS Kalyani',
        email: cleanEmail || undefined,
        phone: cleanPhone || undefined,
        categoryId: mapToCategoryId(rawCat),
        seatId: rawSeat || undefined,
        notes: notesParts.length > 0 ? notesParts.join(' | ') : undefined,
        isVip: rawCat?.toLowerCase().includes('vip') || false,
      };

      sheetAttendees.push(attendee);
    }

    if (sheetAttendees.length > 0) {
      sheetResults.push({
        sheetName,
        totalRows: sheetAttendees.length,
        attendees: sheetAttendees,
        headers: detectedHeaders,
      });
      globalAttendees.push(...sheetAttendees);
    }
  }

  // Fallback: If no sheets parsed with above logic (e.g. simple 1-sheet CSV/XLSX), parse sheet 1 directly
  if (sheetResults.length === 0 && workbook.SheetNames.length > 0) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json<any>(firstSheet, { defval: '' });
    const attendees: Attendee[] = jsonRows.map((row, idx) => {
      const name = row.Name || row.name || row['Student Name'] || row['NAME'] || `Guest #${idx + 1}`;
      const enroll = row['Enrollment Number'] || row['Enrollment No'] || row['Enrollment'] || row['Roll No'] || '';
      return {
        id: `att-upload-${Date.now()}-${idx + 1}`,
        name: String(name),
        designation: row.Designation || row.designation || row.Title || 'Guest',
        department: row.Department || row.department || '',
        institution: row.Institution || row.institution || 'AIIMS Kalyani',
        email: extractEmail(row.Email || row.email || row['Email ID'] || ''),
        phone: String(row.Phone || row.phone || row['Mobile No'] || row.Mobile || ''),
        categoryId: mapToCategoryId(row.Category || row.category || ''),
        seatId: row.SeatId || row.seatId || row.Seat || undefined,
        notes: enroll ? `Enrollment No: ${enroll}` : undefined,
      };
    });

    if (attendees.length > 0) {
      sheetResults.push({
        sheetName: workbook.SheetNames[0],
        totalRows: attendees.length,
        attendees,
        headers: Object.keys(jsonRows[0] || {}),
      });
      globalAttendees.push(...attendees);
    }
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    sheets: sheetResults,
    allAttendees: globalAttendees,
  };
}

/**
 * Export full master workbook with detailed tabs to an Excel (.xlsx) file
 */
export function exportRosterToExcel(seats: Seat[], attendees: Attendee[], eventTitle: string) {
  const wb = XLSX.utils.book_new();

  const attendeeMap = new Map<string, Attendee>();
  attendees.forEach((a) => {
    if (a.seatId) attendeeMap.set(a.seatId, a);
  });

  // --- Sheet 1: Master Seating Plan ---
  const seatingRows = seats.map((s) => {
    const att = attendeeMap.get(s.id) || s.attendee;
    const cat = CATEGORIES[s.categoryId] || { name: s.categoryId };
    const status = s.isBlocked ? 'BLOCKED' : att ? 'ASSIGNED' : 'RESERVED';

    return {
      'Seat ID': s.id,
      'Seat Number': s.seatNumber,
      'Block': s.blockName,
      'Tier': s.tier,
      'Row': s.row,
      'Col': s.col,
      'Category': cat.name,
      'Status': status,
      'Guest Name': att?.name || '',
      'Designation / Role': att?.designation || att?.title || '',
      'Department / Discipline': att?.department || '',
      'Institution': att?.institution || '',
      'Email': att?.email || '',
      'Phone': att?.phone || '',
      'Notes': att?.notes || '',
      'Recommended Gate': s.gateRecommendation,
    };
  });
  const wsSeating = XLSX.utils.json_to_sheet(seatingRows);
  XLSX.utils.book_append_sheet(wb, wsSeating, 'Seating Allocation');

  // --- Sheet 2: All Guests Roster ---
  const guestRows = attendees.map((a, idx) => {
    const cat = CATEGORIES[a.categoryId] || { name: a.categoryId };
    return {
      'Sl. No.': idx + 1,
      'Guest Name': a.name,
      'Designation': a.designation || a.title || '',
      'Department': a.department || '',
      'Institution': a.institution || 'AIIMS Kalyani',
      'Category': cat.name,
      'Assigned Seat': a.seatId || 'Unassigned',
      'Email': a.email || '',
      'Phone': a.phone || '',
      'Notes / Enrollment': a.notes || '',
    };
  });
  const wsGuests = XLSX.utils.json_to_sheet(guestRows);
  XLSX.utils.book_append_sheet(wb, wsGuests, 'Guest Roster');

  // --- Sheet 3: Zone Statistics ---
  const categoryCounts: Record<string, { total: number; seated: number }> = {};
  seats.forEach((s) => {
    if (!categoryCounts[s.categoryId]) categoryCounts[s.categoryId] = { total: 0, seated: 0 };
    categoryCounts[s.categoryId].total++;
    if (s.attendee || attendeeMap.has(s.id)) categoryCounts[s.categoryId].seated++;
  });

  const statsRows = Object.entries(categoryCounts).map(([catId, counts]) => {
    const cat = CATEGORIES[catId] || { name: catId };
    return {
      'Zone / Category': cat.name,
      'Total Capacity': counts.total,
      'Assigned Guests': counts.seated,
      'Available Seats': counts.total - counts.seated,
      'Occupancy %': counts.total > 0 ? `${Math.round((counts.seated / counts.total) * 100)}%` : '0%',
    };
  });
  const wsStats = XLSX.utils.json_to_sheet(statsRows);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Zone Statistics');

  const safeFilename = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_seating_master.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

/**
 * Download a starter Excel template for adding attendees
 */
export function downloadExcelSampleTemplate() {
  const wb = XLSX.utils.book_new();

  const sampleMbbs = [
    { 'Sl. No.': 1, 'Name': 'Dr. Abhilasha Saboth', 'Enrollment Number': '20200151', 'Email': 'abhilasha.mbbs-2020@aiimskalyani.edu.in', 'Mobile No': '9830111223' },
    { 'Sl. No.': 2, 'Name': 'Dr. Abil Kumar', 'Enrollment Number': '20200152', 'Email': 'abil.mbbs-2020@aiimskalyani.edu.in', 'Mobile No': '9830122334' },
    { 'Sl. No.': 3, 'Name': 'Dr. Adithya Bijith', 'Enrollment Number': '20200153', 'Email': 'adithya.mbbs-2020@aiimskalyani.edu.in', 'Mobile No': '9830133445' },
  ];
  const wsMbbs = XLSX.utils.json_to_sheet(sampleMbbs);
  XLSX.utils.book_append_sheet(wb, wsMbbs, 'MBBS');

  const sampleMd = [
    { 'SL': 1, 'Name': 'Dr. Samya Mitra', 'Department': 'Paediatric', 'Enrolment No.': '20230311', 'Email ID': 'samyamitra120598@gmail.com' },
    { 'SL': 2, 'Name': 'Dr. Saravana Prathap B.', 'Department': 'Conservative Dentistry', 'Enrolment No.': '20230313', 'Email ID': 'saravana.prathap77@gmail.com' },
  ];
  const wsMd = XLSX.utils.json_to_sheet(sampleMd);
  XLSX.utils.book_append_sheet(wb, wsMd, 'MDMSMDS');

  const sampleNursing = [
    { 'SL. NO': 1, 'ENROLLMENT NO.': '20210201', 'NAME': 'ADITI MANDAL', 'MOBILE NO': '7584874474', 'EMAIL. ID': 'aditimandal0328@gmail.com' },
    { 'SL. NO': 2, 'ENROLLMENT NO.': '20210202', 'NAME': 'ADRITA MUKHERJEE', 'MOBILE NO': '9382419184', 'EMAIL. ID': 'mukherjeeadrita8@gmail.com' },
  ];
  const wsNursing = XLSX.utils.json_to_sheet(sampleNursing);
  XLSX.utils.book_append_sheet(wb, wsNursing, 'B.Sc(Nursing)');

  XLSX.writeFile(wb, 'convocation_attendee_template.xlsx');
}
