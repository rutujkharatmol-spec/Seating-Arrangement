import type * as XLSXTypes from 'xlsx';
import { Attendee, CategoryId, Seat } from '../types/seating';
import { CATEGORIES } from '../data/categories';
import { compareSeatFillOrder } from './autoSeat';
import { getMobileKioskUrl } from '../services/cloudSync';

/**
 * SheetJS is ~430 kB minified — larger than the rest of the app put together —
 * and is only needed the moment somebody actually imports or exports a
 * spreadsheet. Loading it on demand keeps it out of the first paint for
 * everyone, which matters most for guests opening the seat tracker on a phone.
 * The module is cached by the browser after the first call, so repeated
 * exports pay the cost once.
 */
let xlsxPromise: Promise<typeof XLSXTypes> | null = null;
function loadXlsx(): Promise<typeof XLSXTypes> {
  if (!xlsxPromise) xlsxPromise = import('xlsx');
  return xlsxPromise;
}

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
 * Words that keep their capitalisation, and words that stay lowercase.
 *
 * Deliberately plain arrays, and deliberately not Sets: the value being tested
 * is a freshly allocated `toUpperCase()` result, so `Set.has` has to hash the
 * whole string, whereas `Array.includes` over a dozen interned literals rejects
 * a non-match on a length check. Swapping these for Sets measured ~10% slower
 * on a real roster. Hoisting them out of the per-word callback is the part that
 * was worth doing.
 */
const ACRONYMS = ['MBBS', 'MD', 'MS', 'MDS', 'ENT', 'AIIMS', 'II', 'III', 'IV', 'KP', 'P', 'B.'];
const LOWERCASE_WORDS = ['and', '&', 'of', 'in', 'the'];

/**
 * Format ALL-CAPS names into clean Title Case while preserving acronyms/degrees
 */
export function titleCase(str: string): string {
  if (!str) return '';
  const parts = String(str).trim().split(/\s+/);
  return parts
    .map((p) => {
      const upper = p.toUpperCase();
      if (ACRONYMS.includes(upper)) return upper;
      const lower = p.toLowerCase();
      if (LOWERCASE_WORDS.includes(lower)) return lower;
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
  if (clean.includes('wheelchair') || clean.includes('accessible') || clean.includes('divyang')) return 'accessible';
  if (clean.includes('awardee') || clean.includes('rank') || clean.includes('medal') || clean.includes('topper')) return 'awardees';
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
  const XLSX = await loadXlsx();
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
export async function exportRosterToExcel(seats: Seat[], attendees: Attendee[], eventTitle: string) {
  const XLSX = await loadXlsx();
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
      'Live Seat Link': getMobileKioskUrl(s.id),
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
      'Live Seat Link': a.seatId ? getMobileKioskUrl(a.seatId) : '',
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
export async function downloadExcelSampleTemplate() {
  const XLSX = await loadXlsx();
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

/** Shared collator: building one per comparison dominates a roster-wide sort. */
const NAME_COLLATOR = new Intl.Collator('en', { sensitivity: 'base' });

/** Graduating students: the three award-receiving cohorts. */
const STUDENT_CATEGORY_IDS: CategoryId[] = ['mbbs', 'nursing', 'pg'];

/** Parents are listed as "Guest of <student name>" in their department field. */
function guestOfName(a: Attendee): string {
  const dept = a.department || '';
  const m = dept.match(/^\s*guest of\s+(.*)$/i);
  return m ? m[1].trim() : '';
}

/** A key that ignores case, titles and punctuation, so "DR. Ramya KP" matches "Ramya K P". */
function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Export a workbook of graduating students and their parents with seat numbers,
 * each list given twice: alphabetically (to look a person up) and in seat order
 * (for ushers walking the rows).
 */
export async function exportStudentsAndParentsExcel(seats: Seat[], attendees: Attendee[], eventTitle: string) {
  const XLSX = await loadXlsx();
  const seatById = new Map(seats.map((s) => [s.id, s]));
  const seatOrder = new Map<string, number>();
  [...seats].sort(compareSeatFillOrder).forEach((s, i) => seatOrder.set(s.id, i));

  const students = attendees.filter((a) => STUDENT_CATEGORY_IDS.includes(a.categoryId));
  const parents = attendees.filter((a) => a.categoryId === 'accompanying');

  const studentByName = new Map<string, Attendee>();
  students.forEach((s) => {
    const key = nameKey(s.name);
    if (key && !studentByName.has(key)) studentByName.set(key, s);
  });

  const seatLabel = (seatId?: string) => (seatId ? seatById.get(seatId)?.seatNumber || seatId : 'Not seated');
  const seatBlock = (seatId?: string) => (seatId ? seatById.get(seatId)?.blockName || '' : '');
  const seatRow = (seatId?: string) => (seatId ? seatById.get(seatId)?.row || '' : '');
  const seatGate = (seatId?: string) => (seatId ? seatById.get(seatId)?.gateRecommendation || '' : '');
  const orderOf = (seatId?: string) => (seatId && seatOrder.has(seatId) ? seatOrder.get(seatId)! : Number.MAX_SAFE_INTEGER);

  const studentRow = (a: Attendee, idx: number) => ({
    'Sl. No.': idx + 1,
    'Student Name': a.name,
    'Course / Cohort': (CATEGORIES[a.categoryId] || { name: a.categoryId }).name,
    'Department / Discipline': a.department || '',
    'Enrollment / Notes': a.notes || '',
    'Seat Number': seatLabel(a.seatId),
    'Row': seatRow(a.seatId),
    'Block': seatBlock(a.seatId),
    'Entry Gate': seatGate(a.seatId),
    'Live Map Link': a.seatId ? getMobileKioskUrl(a.seatId) : '',
    'Email': a.email || '',
    'Phone': a.phone || '',
  });

  const parentRow = (a: Attendee, idx: number) => {
    const of = guestOfName(a);
    const student = of ? studentByName.get(nameKey(of)) : undefined;
    return {
      'Sl. No.': idx + 1,
      'Parent / Guardian Name': a.name,
      'Guest Of (Student)': of || a.department || '',
      "Student's Seat": student ? seatLabel(student.seatId) : '',
      'Seat Number': seatLabel(a.seatId),
      'Row': seatRow(a.seatId),
      'Block': seatBlock(a.seatId),
      'Entry Gate': seatGate(a.seatId),
      'Live Map Link': a.seatId ? getMobileKioskUrl(a.seatId) : '',
      'Email': a.email || '',
      'Phone': a.phone || '',
    };
  };

  // One reusable collator. `String.localeCompare(x, locale, options)` has to
  // build a collator on every call in most engines, and these sorts run
  // ~10 x n log n comparisons over the whole roster.
  const byName = (a: Attendee, b: Attendee) => NAME_COLLATOR.compare(a.name, b.name);
  const bySeat = (a: Attendee, b: Attendee) => orderOf(a.seatId) - orderOf(b.seatId) || byName(a, b);

  // Sorted once and reused by both the A-Z sheet and the Families sheet.
  const studentsByName = [...students].sort(byName);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(studentsByName.map(studentRow)),
    'Students A-Z'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([...students].sort(bySeat).map(studentRow)),
    'Students by Seat'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([...parents].sort(byName).map(parentRow)),
    'Parents A-Z'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([...parents].sort(bySeat).map(parentRow)),
    'Parents by Seat'
  );

  // --- Families: one line per student, with the parents seated alongside ---
  const parentsByStudent = new Map<string, Attendee[]>();
  parents.forEach((p) => {
    const key = nameKey(guestOfName(p));
    if (!key) return;
    const list = parentsByStudent.get(key);
    if (list) list.push(p);
    else parentsByStudent.set(key, [p]);
  });

  const familyRows = studentsByName.map((s, idx) => {
    const kin = (parentsByStudent.get(nameKey(s.name)) || []).sort(bySeat);
    return {
      'Sl. No.': idx + 1,
      'Student Name': s.name,
      'Course / Cohort': (CATEGORIES[s.categoryId] || { name: s.categoryId }).name,
      'Student Seat': seatLabel(s.seatId),
      'Student Block': seatBlock(s.seatId),
      'No. of Guests': kin.length,
      'Guest 1': kin[0]?.name || '',
      'Guest 1 Seat': kin[0] ? seatLabel(kin[0].seatId) : '',
      'Guest 2': kin[1]?.name || '',
      'Guest 2 Seat': kin[1] ? seatLabel(kin[1].seatId) : '',
      'Guest Block': kin[0] ? seatBlock(kin[0].seatId) : '',
      'Guest Gate': kin[0] ? seatGate(kin[0].seatId) : '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(familyRows), 'Families');

  const safeFilename = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_students_parents_seats.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}
