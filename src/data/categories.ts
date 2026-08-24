import { CategoryId, CategoryInfo } from '../types/seating';

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  vip: {
    id: 'vip',
    name: 'VIP & Dignitaries',
    shortName: 'VIP',
    color: '#86efac',       // Light vibrant emerald green
    textColor: '#14532d',
    borderColor: '#22c55e',
    description: 'Chief guests, Ministry officials, Deans, Director & Guest of Honor (Rows A-D Center, 4×13=52 seats)',
    defaultCount: 52,
    priority: 1,
    recommendedGate: 'Gate-1 or Gate-2',
  },
  senior_faculty: {
    id: 'senior_faculty',
    name: 'Registrar + Senior Faculty',
    shortName: 'Senior Faculty',
    color: '#fed7aa',       // Terracotta / Peachy orange
    textColor: '#7c2d12',
    borderColor: '#ea580c',
    description: 'Registrar, Department Heads & Senior Professors (Rows A-H Left)',
    defaultCount: 54,
    priority: 2,
    recommendedGate: 'Gate-2',
  },
  faculty: {
    id: 'faculty',
    name: 'Faculty Members',
    shortName: 'Faculty',
    color: '#fef08a',       // Soft bright yellow
    textColor: '#713f12',
    borderColor: '#eab308',
    description: 'Assistant & Associate Professors, Resident Doctors & Teaching Staff (Rows H-U Center)',
    defaultCount: 182,
    priority: 3,
    recommendedGate: 'Gate-1 or Gate-2',
  },
  awardees: {
    id: 'awardees',
    name: 'Awardees & Medalists',
    shortName: 'Awardees',
    color: '#bbf7d0',       // Mint green with magenta border
    textColor: '#14532d',
    borderColor: '#d946ef',
    description: 'Prize winners, Gold medalists, Presenters & Honorees (Rows I-O Right)',
    defaultCount: 49,
    priority: 4,
    recommendedGate: 'Gate-1',
  },
  reporters: {
    id: 'reporters',
    name: 'Media & Press Reporters',
    shortName: 'Reporter',
    color: '#93c5fd',       // Steel / Sky blue
    textColor: '#1e3a8a',
    borderColor: '#3b82f6',
    description: 'Accredited journalists, press photographers & videographers (Rows E-G Center)',
    defaultCount: 39,
    priority: 5,
    recommendedGate: 'Gate-2',
  },
  accompanying: {
    id: 'accompanying',
    name: 'Accompanying Persons',
    shortName: 'Accompanying',
    color: '#c7d2fe',       // Soft indigo/periwinkle
    textColor: '#312e81',
    borderColor: '#6366f1',
    description: 'Family members, relatives & invited companions of faculty and awardees (Rows V-W Center, P-X Right)',
    defaultCount: 89,       // 26 Center + 63 Right
    priority: 6,
    recommendedGate: 'Gate-1',
  },
  console: {
    id: 'console',
    name: 'AV & Technical Console',
    shortName: 'Console',
    color: '#a5f3fc',       // Cyan / Light Aqua
    textColor: '#164e63',
    borderColor: '#06b6d4',
    description: 'Audio-visual operators, sound engineers, lighting & live stream control (Rows I-M Left)',
    defaultCount: 35,
    priority: 7,
    recommendedGate: 'Gate-2',
  },
  band_party: {
    id: 'band_party',
    name: 'Band Party & Orchestra',
    shortName: 'Band Party',
    color: '#fde047',       // Warm yellow gold with amber border
    textColor: '#713f12',
    borderColor: '#f59e0b',
    description: 'Military / Institutional band musicians and choir (Upper Center Tier)',
    defaultCount: 39,
    priority: 8,
    recommendedGate: 'Balcony Gate',
  },
  audience: {
    id: 'audience',
    name: 'General Audience & Students',
    shortName: 'Audience',
    color: '#e9d5ff',       // Lavender / Light Purple
    textColor: '#581c87',
    borderColor: '#a855f7',
    description: 'Undergraduate & Postgraduate medical students, nursing staff, and general attendees',
    defaultCount: 174,      // 77 Lower Left + 35 Upper Left + 27 Upper Center + 35 Upper Right
    priority: 9,
    recommendedGate: 'Gate-2 or Balcony Gate',
  },
  blocked: {
    id: 'blocked',
    name: 'Blocked / Reserved Buffer',
    shortName: 'Blocked',
    color: '#fecdd3',       // Soft red / pink
    textColor: '#881337',
    borderColor: '#f43f5e',
    description: 'Seats blocked for camera cranes, emergency pathways, or security buffer (Rows A-H Right)',
    defaultCount: 54,
    priority: 10,
    recommendedGate: 'N/A',
  },
  available: {
    id: 'available',
    name: 'Unassigned / Available',
    shortName: 'Available',
    color: '#f1f5f9',       // Clean slate / off-white
    textColor: '#334155',
    borderColor: '#cbd5e1',
    description: 'Open seats available for walk-in allocation',
    defaultCount: 0,
    priority: 11,
    recommendedGate: 'Gate-1 or Gate-2',
  },
};

export const DEFAULT_VOLUNTEERS = [
  { id: 'v1', name: 'Dr. Arjun Sen', role: 'Upper Balcony Coordinator', location: 'Upper Left Balcony Entrance', phone: '+91 98301 11223', x: 75, y: 70, gate: 'Balcony Gate' },
  { id: 'v2', name: 'Pooja Sharma', role: 'Upper Center Exit Usher', location: 'Upper Center Left Exit', phone: '+91 98301 22334', x: 340, y: 130, gate: 'Balcony Gate' },
  { id: 'v3', name: 'Rahul Mondal', role: 'Upper Center Exit Usher', location: 'Upper Center Right Exit', phone: '+91 98301 33445', x: 680, y: 130, gate: 'Balcony Gate' },
  { id: 'v4', name: 'Dr. Neha Ghosh', role: 'Upper Right Balcony Usher', location: 'Upper Right Balcony Corner', phone: '+91 98301 44556', x: 940, y: 70, gate: 'Balcony Gate' },
  { id: 'v5', name: 'Siddharth Roy', role: 'Mid-Left Cross-Aisle Usher', location: 'Mid-Left Cross Aisle (Row M/N)', phone: '+91 98301 55667', x: 360, y: 280, gate: 'Gate-2' },
  { id: 'v6', name: 'Ananya Paul', role: 'Mid-Right Cross-Aisle Usher', location: 'Mid-Right Cross Aisle (Row M/N)', phone: '+91 98301 66778', x: 655, y: 280, gate: 'Gate-1' },
  { id: 'v7', name: 'Debashis Das', role: 'Outer Left Wing Usher', location: 'Left Outer Aisle (Row S/T)', phone: '+91 98301 77889', x: 45, y: 430, gate: 'Gate-2' },
  { id: 'v8', name: 'Sneha Mukherjee', role: 'Center Block Aisle Usher', location: 'Center Aisle (Row S/T)', phone: '+91 98301 88990', x: 678, y: 430, gate: 'Gate-1' },
  { id: 'v9', name: 'Dr. Kaushik Basu', role: 'Console & Tech Liaison', location: 'Left Aisle (Row J/K)', phone: '+91 98301 99001', x: 45, y: 660, gate: 'Gate-2' },
  { id: 'v10', name: 'Mousumi Dey', role: 'Faculty Seating Usher', location: 'Center Aisle (Row J/K)', phone: '+91 98301 10112', x: 678, y: 660, gate: 'Gate-1' },
  { id: 'v11', name: 'Tanmoy Banerjee', role: 'Awardees Seating Usher', location: 'Right Aisle (Row J/K)', phone: '+91 98301 21223', x: 960, y: 660, gate: 'Gate-1' },
  { id: 'v12', name: 'Dr. Subhashree Sen', role: 'Gate-2 Lead Usher', location: 'Gate-2 Main Entry (Bottom Left)', phone: '+91 98301 32334', x: 45, y: 920, gate: 'Gate-2' },
  { id: 'v13', name: 'Sourav Ganguly', role: 'VIP & Stage Coordinator', location: 'Center Front Aisle (Row A)', phone: '+91 98301 43445', x: 655, y: 940, gate: 'Gate-1 or Gate-2' },
  { id: 'v14', name: 'Dr. Rituparna Bose', role: 'Gate-1 Lead Usher', location: 'Gate-1 Main Entry (Bottom Right)', phone: '+91 98301 54556', x: 960, y: 920, gate: 'Gate-1' },
];
