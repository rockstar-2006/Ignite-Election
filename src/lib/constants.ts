export const ELECTION_POSTS = {
  '6th': [
    { id: 'president', name: 'President' },
    { id: 'cultural', name: 'Cultural' },
    { id: 'media', name: 'Media' },
    { id: 'treasurer', name: 'Treasurer' },
    { id: 'technical', name: 'Technical' },
    { id: 'secretary', name: 'Secretary' },
    { id: 'content', name: 'Content' },
  ],
  '4th': [
    { id: 'vp', name: 'Vice President' },
    { id: 'ast_cultural', name: 'Assistant Cultural' },
    { id: 'ast_media', name: 'Assistant Media' },
    { id: 'ast_treasurer', name: 'Assistant Treasurer' },
    { id: 'ast_technical', name: 'Assistant Technical' },
    { id: 'ast_secretary', name: 'Assistant Secretary' },
    { id: 'ast_content', name: 'Assistant Content' },
  ],
} as const;

export function parseSemesterFromEmail(email: string): string | null {
  const prefix = email.split('@')[0].toLowerCase();
  
  // Format: name.23ad... or 23ad...
  if (prefix.includes('23ad')) return '6th';
  if (prefix.includes('12ad')) return '6th'; // Support other patterns if they exist
  if (prefix.includes('24ad')) return '4th';
  
  return null;
}

export const ADMIN_EMAILS = [
  'bhushan.poojary2006@gmail.com',
  'varnothsavasode@gmail.com',
  'Shabana.ds@sode-edu.in',
  'ranjan.cs@sode-edu.in',
  process.env.ADMIN_EMAIL || '',
].filter(Boolean);
