import { Seat, Attendee, QuestionnaireAnswers, Volunteer } from '../types/seating';
import { CATEGORIES } from '../data/categories';

/**
 * Export seating allocation as CSV
 */
export function exportSeatingToCsv(seats: Seat[], attendees: Attendee[], eventTitle: string) {
  const attendeeMap = new Map<string, Attendee>();
  attendees.forEach((a) => {
    if (a.seatId) attendeeMap.set(a.seatId, a);
  });

  const headers = [
    'Seat ID',
    'Block',
    'Tier',
    'Row',
    'Col',
    'Category',
    'Status',
    'Attendee Name',
    'Designation/Title',
    'Department',
    'Institution',
    'Recommended Gate',
  ];

  const rows = seats.map((s) => {
    const att = attendeeMap.get(s.id) || s.attendee;
    const cat = CATEGORIES[s.categoryId] || { name: s.categoryId };
    const status = s.isBlocked ? 'BLOCKED' : att ? 'ASSIGNED' : 'RESERVED';

    return [
      `"${s.id}"`,
      `"${s.blockName}"`,
      `"${s.tier}"`,
      `"${s.row}"`,
      `"${s.col}"`,
      `"${cat.name}"`,
      `"${status}"`,
      `"${att?.name || ''}"`,
      `"${att?.designation || att?.title || ''}"`,
      `"${att?.department || ''}"`,
      `"${att?.institution || ''}"`,
      `"${s.gateRecommendation}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_seating_list.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export full state as JSON backup
 */
export function exportConfigurationJson(
  seats: Seat[],
  attendees: Attendee[],
  answers: QuestionnaireAnswers,
  volunteers: Volunteer[] = [],
  filename?: string
) {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    eventTitle: answers.eventTitle,
    departmentName: answers.departmentName,
    answers,
    seats,
    attendees,
    volunteers,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || buildBackupFilename(answers.eventTitle));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse CSV attendee list
 */
export function parseAttendeesCsv(csvText: string): Partial<Attendee>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes('name'));
  const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('designation') || h.includes('role'));
  const deptIdx = headers.findIndex((h) => h.includes('dept') || h.includes('department'));
  const instIdx = headers.findIndex((h) => h.includes('inst') || h.includes('institution') || h.includes('org'));
  const catIdx = headers.findIndex((h) => h.includes('cat') || h.includes('category'));
  const seatIdx = headers.findIndex((h) => h.includes('seat'));

  const results: Partial<Attendee>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Regex for CSV with quoted strings
    const match = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    const cols = (match || rawLine.split(',')).map((c) => c.replace(/^"|"$/g, '').trim());

    const name = nameIdx >= 0 ? cols[nameIdx] : cols[0];
    if (!name) continue;

    results.push({
      id: `csv-att-${Date.now()}-${i}`,
      name,
      designation: titleIdx >= 0 ? cols[titleIdx] : '',
      department: deptIdx >= 0 ? cols[deptIdx] : '',
      institution: instIdx >= 0 ? cols[instIdx] : 'AIIMS Kalyani',
      categoryId: (catIdx >= 0 && cols[catIdx]) ? (cols[catIdx].toLowerCase().replace(/\s+/g, '_') as any) : 'faculty',
      seatId: seatIdx >= 0 ? cols[seatIdx] : undefined,
    });
  }

  return results;
}

/**
 * Read back a file produced by `exportConfigurationJson`.
 *
 * Rejects with a plain-language message rather than a parser error, because
 * the person opening the file is the one who needs to understand what is wrong.
 */
export async function importConfigurationJson(file: File): Promise<{
  answers: QuestionnaireAnswers;
  seats: Seat[];
  attendees: Attendee[];
  volunteers?: Volunteer[];
}> {
  let data: any;

  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't valid JSON. Please choose a backup file saved from this app.");
  }

  if (!data || !Array.isArray(data.seats) || data.seats.length === 0) {
    throw new Error("That file has no seating layout in it. Please choose a backup saved from this app.");
  }

  if (!Array.isArray(data.attendees)) {
    throw new Error("That file has no attendee list in it. Please choose a backup saved from this app.");
  }

  return {
    answers: data.answers,
    seats: data.seats,
    attendees: data.attendees,
    volunteers: Array.isArray(data.volunteers) ? data.volunteers : undefined,
  };
}

/** e.g. "convocation-2026-plan-2026-08-24.json" — sorts nicely in a folder. */
function buildBackupFilename(eventTitle: string) {
  const slug = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'seating';
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-plan-${date}.json`;
}
