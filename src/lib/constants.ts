export interface OfficialPost {
  id: string;
  name: string;
  seats: number; // 1 or 2
  genderRule?: '1_boy_1_girl' | 'any';
  description?: string;
}

export const OFFICIAL_COUNCIL_POSTS: OfficialPost[] = [
  { id: 'president', name: 'President', seats: 1, genderRule: 'any', description: 'Head of Student Council (1 Winner)' },
  { id: 'vice_president', name: 'Vice-President', seats: 1, genderRule: 'any', description: 'Deputy Head of Student Council (1 Winner)' },
  { id: 'general_secretary', name: 'General Secretary', seats: 2, genderRule: '1_boy_1_girl', description: 'Student Council General Secretary (2 Winners: 1 Boy & 1 Girl)' },
  { id: 'cultural_coordinator', name: 'Cultural Coordinator', seats: 2, genderRule: '1_boy_1_girl', description: 'Cultural Activities & Events (2 Winners: 1 Boy & 1 Girl)' },
  { id: 'technical_coordinator', name: 'Technical Coordinator', seats: 2, genderRule: '1_boy_1_girl', description: 'Technical & Coding Events (2 Winners: 1 Boy & 1 Girl)' },
  { id: 'sports_coordinator', name: 'Sports Coordinator', seats: 2, genderRule: '1_boy_1_girl', description: 'Sports & Athletics (2 Winners: 1 Boy & 1 Girl)' },
  { id: 'promotional_coordinator', name: 'Promotional Coordinator', seats: 2, genderRule: '1_boy_1_girl', description: 'Media & Promotions (2 Winners: 1 Boy & 1 Girl)' },
];

export const ELECTION_POSTS = {
  '6th': OFFICIAL_COUNCIL_POSTS.map(p => ({ id: p.id, name: p.name })),
  '4th': OFFICIAL_COUNCIL_POSTS.map(p => ({ id: p.id, name: p.name })),
} as const;

export function parseSemesterFromEmail(email: string): string | null {
  if (!email) return null;
  const prefix = email.split('@')[0].toLowerCase();
  
  // Format patterns:
  // 1. 2023 batch -> 6th Semester (e.g. name.23cs045, 23ad001, 4mw23ec010, 12ad)
  if (/(?:^|\.|4mw)23[a-z]{2}/i.test(prefix) || prefix.includes('23ad') || prefix.includes('12ad')) {
    return '6th';
  }
  
  // 2. 2024 batch -> 4th Semester (e.g. name.24cs045, 24ad001, 4mw24ec010)
  if (/(?:^|\.|4mw)24[a-z]{2}/i.test(prefix) || prefix.includes('24ad')) {
    return '4th';
  }

  // 3. 2022 batch -> 8th Semester (if participating)
  if (/(?:^|\.|4mw)22[a-z]{2}/i.test(prefix)) {
    return '8th';
  }

  // 4. 2025 batch -> 2nd Semester (if participating)
  if (/(?:^|\.|4mw)25[a-z]{2}/i.test(prefix)) {
    return '2nd';
  }
  
  return null;
}

export const ADMIN_EMAILS = [
  'admin@sode-edu.in',
  'Shabana.ds@sode-edu.in',
  'ranjan.cs@sode-edu.in',
  'sarvesh.ds@sode-edu.in',
  process.env.ADMIN_EMAIL || '',
].filter((email) => email && email.toLowerCase().endsWith('@sode-edu.in'));
