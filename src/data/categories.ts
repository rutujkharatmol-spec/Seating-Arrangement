import { CategoryInfo, Volunteer } from '../types/seating';

export const CATEGORIES: Record<string, CategoryInfo> = {
  vip: {
    id: 'vip',
    name: 'VIP & Dignitaries',
    shortName: 'VIP',
    color: '#c084fc',       // Royal Purple
    textColor: '#3b0764',
    borderColor: '#7e22ce',
    description: 'Chief guests and dignitaries (Middle Rows B–C, 26 seats)',
    defaultCount: 26,
    priority: 1,
    recommendedGate: 'Gate-1 or Gate-2',
    isCustom: false,
  },
  awardees: {
    id: 'awardees',
    name: 'Rank Holders & Awardees',
    shortName: 'Awardees',
    color: '#e879f9',       // Fuchsia
    textColor: '#701a75',
    borderColor: '#c026d3',
    description: 'MBBS & B.Sc Nursing rank holders and best outgoing students (Left Wing Row B, 7 seats)',
    defaultCount: 7,
    priority: 2,
    recommendedGate: 'Gate-2',
    isCustom: false,
  },
  reporters: {
    id: 'reporters',
    name: 'Media & Press Reporters',
    shortName: 'Reporters',
    color: '#f87171',       // Coral Red
    textColor: '#7f1d1d',
    borderColor: '#dc2626',
    description: 'Journalists, press photographers and videographers (Right Wing Rows A–D, 26 seats)',
    defaultCount: 26,
    priority: 3,
    recommendedGate: 'Gate-1',
    isCustom: false,
  },
  mbbs: {
    id: 'mbbs',
    name: 'MBBS Graduates',
    shortName: 'MBBS',
    color: '#60a5fa',       // Ocean Blue
    textColor: '#1e3a8a',
    borderColor: '#2563eb',
    description: 'MBBS graduates (Left Wing Rows B–H and L–T, 108 seats)',
    defaultCount: 108,
    priority: 4,
    recommendedGate: 'Gate-2',
    isCustom: false,
  },
  nursing: {
    id: 'nursing',
    name: 'Nursing Graduates (B.Sc & M.Sc)',
    shortName: 'Nursing',
    color: '#f472b6',       // Rose Pink
    textColor: '#831843',
    borderColor: '#db2777',
    description: 'B.Sc (Hons) and M.Sc Nursing graduates (Left Wing Rows U–X and Middle Row W12–W20, 37 seats)',
    defaultCount: 37,
    priority: 5,
    recommendedGate: 'Gate-2 or Balcony Gate',
    isCustom: false,
  },
  pg: {
    id: 'pg',
    name: 'PG Residents (MD / MS / MDS)',
    shortName: 'PG Residents',
    color: '#a78bfa',       // Violet Purple
    textColor: '#4c1d95',
    borderColor: '#7c3aed',
    description: 'MD / MS / MDS residents (Middle Rows T–U, 15 seats)',
    defaultCount: 15,
    priority: 6,
    recommendedGate: 'Gate-2',
    isCustom: false,
  },
  accompanying: {
    id: 'accompanying',
    name: 'Parents & Guardians',
    shortName: 'Parents',
    color: '#c7d2fe',       // Soft Lavender
    textColor: '#312e81',
    borderColor: '#4f46e5',
    description: 'Parents and guardians (whole Balcony, Centre R19–R20, Rows S–U and W8–W11, Right Wing Rows I–X and the Exam Section Hall, 384 seats)',
    defaultCount: 384,
    priority: 7,
    recommendedGate: 'Gate-1',
    isCustom: false,
  },
  faculty: {
    id: 'faculty',
    name: 'Faculty & Academic Staff',
    shortName: 'Faculty',
    color: '#fbbf24',       // Sunflower Yellow
    textColor: '#713f12',
    borderColor: '#d97706',
    description: 'Professors, Additional/Associate/Assistant Professors (Middle Rows D–R, less R19–R20, 193 seats)',
    defaultCount: 193,
    priority: 8,
    recommendedGate: 'Gate-1 or Gate-2',
    isCustom: false,
  },
  admin_staff: {
    id: 'admin_staff',
    name: 'Administrative Staff',
    shortName: 'Admin',
    color: '#fb923c',       // Tangerine Orange
    textColor: '#7c2d12',
    borderColor: '#ea580c',
    description: 'Administrative officers and staff (Right Wing Rows E–I, 30 seats)',
    defaultCount: 30,
    priority: 9,
    recommendedGate: 'Gate-1',
    isCustom: false,
  },
  it_staff: {
    id: 'it_staff',
    name: 'IT Dept Staff',
    shortName: 'IT dept staff',
    color: '#2dd4bf',       // Teal
    textColor: '#134e4a',
    borderColor: '#0d9488',
    description: 'IT department staff (Left Wing Rows I–K, 21 seats)',
    defaultCount: 21,
    priority: 10,
    recommendedGate: 'Gate-2',
    isCustom: false,
  },
  guide: {
    id: 'guide',
    name: 'Event Guides & Ushers',
    shortName: 'Guide',
    color: '#a3e635',       // Lime Green
    textColor: '#365314',
    borderColor: '#65a30d',
    description: 'Event guides, ushers and coordinators (Left Wing Row A, 5 seats)',
    defaultCount: 5,
    priority: 11,
    recommendedGate: 'Gate-2',
    isCustom: false,
  },
  accessible: {
    id: 'accessible',
    name: 'Wheelchair / Accessible Seating',
    shortName: 'Wheelchair',
    color: '#22d3ee',       // Cyan
    textColor: '#164e63',
    borderColor: '#0891b2',
    description: 'Wheelchair users and assisted guests (Left Wing Row A corner, 2 seats)',
    defaultCount: 2,
    priority: 12,
    recommendedGate: 'Gate-1',
    isCustom: false,
  },
  available: {
    id: 'available',
    name: 'Unassigned / Available',
    shortName: 'Available',
    color: '#e2e8f0',       // Slate Gray
    textColor: '#475569',
    borderColor: '#94a3b8',
    description: 'Seats with no section assigned yet',
    defaultCount: 0,
    priority: 13,
    recommendedGate: 'Gate-1 or Gate-2',
    isCustom: false,
  },
};

export const COLOR_SWATCH_PRESETS = [
  { color: '#4ade80', borderColor: '#16a34a', textColor: '#14532d', label: 'Emerald' },
  { color: '#fbbf24', borderColor: '#d97706', textColor: '#713f12', label: 'Yellow' },
  { color: '#fb923c', borderColor: '#ea580c', textColor: '#7c2d12', label: 'Orange' },
  { color: '#f87171', borderColor: '#dc2626', textColor: '#7f1d1d', label: 'Red' },
  { color: '#60a5fa', borderColor: '#2563eb', textColor: '#1e3a8a', label: 'Blue' },
  { color: '#c7d2fe', borderColor: '#4f46e5', textColor: '#312e81', label: 'Lavender' },
  { color: '#a78bfa', borderColor: '#7c3aed', textColor: '#4c1d95', label: 'Violet' },
  { color: '#e879f9', borderColor: '#c026d3', textColor: '#701a75', label: 'Fuchsia' },
  { color: '#f472b6', borderColor: '#db2777', textColor: '#831843', label: 'Pink' },
  { color: '#2dd4bf', borderColor: '#0d9488', textColor: '#134e4a', label: 'Teal' },
  { color: '#a3e635', borderColor: '#65a30d', textColor: '#365314', label: 'Lime' },
  { color: '#22d3ee', borderColor: '#0891b2', textColor: '#164e63', label: 'Cyan' },
  { color: '#94a3b8', borderColor: '#64748b', textColor: '#1e293b', label: 'Slate' },
  { color: '#fca5a5', borderColor: '#e11d48', textColor: '#881337', label: 'Rose' },
];

/**
 * No volunteers are defined by default. The list that used to sit here was
 * placeholder data; real coordinators are added from the Live Editor's
 * Volunteers tab, so nobody invented appears on the printed map.
 */
export const DEFAULT_VOLUNTEERS: Volunteer[] = [];
