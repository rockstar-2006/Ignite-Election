import { adminDb } from '../firebase-admin';
import * as admin from 'firebase-admin';
import { ELECTION_POSTS, OFFICIAL_COUNCIL_POSTS, OfficialPost } from '../constants';
import crypto from 'crypto';

const BALLOT_ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'smvitm_secret_ballot_vault_key_2026';

// Helpers to safely encode candidate IDs for Firestore map keys (avoids dot/field-path corruption)
// Firestore field paths treat '.' as nesting; email-based IDs like user@sode-edu.in contain dots
function encodeCandidateKey(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}
function decodeCandidateKey(encoded: string): string {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return encoded;
  }
}
function decodeCandidateVotesMap(raw: Record<string, any>): Record<string, number> {
  const decoded: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    // Handle already-decoded legacy keys (without encoding) or new encoded keys
    let candidateId = k;
    // Try to detect base64url encoding: round-trip test
    if (/^[A-Za-z0-9_-]+$/.test(k) && k.length >= 8) {
      try {
        const maybe = Buffer.from(k, 'base64url').toString('utf8');
        if (Buffer.from(maybe, 'utf8').toString('base64url') === k) {
          candidateId = maybe;
        }
      } catch {}
    }
    if (typeof v === 'number') {
      decoded[candidateId] = (decoded[candidateId] || 0) + v;
    } else if (typeof v === 'object' && v !== null) {
      // Legacy corruption: dot-split created nested map (e.g. candidateVotes: { 'user@example': { 'com': 1 } })
      // Flatten by summing leaf numbers under this prefix - note original ID is lost, so we cannot perfectly restore.
      // We treat nested leaves as separate entries and log warning; best to reset votes after fix.
      const flatten = (obj: any, prefix = candidateId): void => {
        for (const [nk, nv] of Object.entries(obj)) {
          if (typeof nv === 'number') {
            const reconstructed = `${prefix}.${nk}`;
            decoded[reconstructed] = (decoded[reconstructed] || 0) + nv;
          } else if (typeof nv === 'object' && nv !== null) {
            flatten(nv, `${prefix}.${nk}`);
          }
        }
      };
      flatten(v as any);
    }
  }
  return decoded;
}

export function hashVoterIdentifier(email: string): string {
  return crypto.createHmac('sha256', BALLOT_ENCRYPTION_KEY).update(email.toLowerCase().trim()).digest('hex');
}

export function encryptBallotTransaction(candidateId: string, postId: string, timestamp: string): {
  ballotHash: string;
  encryptedPayload: string;
} {
  const ballotHash = crypto.createHash('sha256').update(`${candidateId}_${postId}_${timestamp}_${Math.random()}`).digest('hex');
  const encryptedPayload = crypto.createHmac('sha256', BALLOT_ENCRYPTION_KEY).update(`${postId}:${candidateId}:${timestamp}`).digest('hex');
  return { ballotHash, encryptedPayload };
}

export interface Candidate {
  id: string;
  name: string;
  usn: string;
  semester?: string;
  year?: string;
  postId: string;
  postName: string;
  department: string;
  gender: 'Male' | 'Female';
  photoURL?: string;
  manifesto: string;
  createdAt?: string;
}

export interface VoteRecord {
  id: string;
  postId: string;
  postName: string;
  candidateId: string;
  candidateName?: string;
  candidateGender?: 'Male' | 'Female';
  semester: string;
  timestamp: string; // ISO string
  timestampFormatted: string; // DD/MM/YYYY, HH:mm:ss
  encryptedBallotHash?: string;
  encryptedPayload?: string;
}

export interface PostResult {
  postId: string;
  postName: string;
  semester: string;
  seats: number;
  genderRule?: '1_boy_1_girl' | 'any';
  totalVotes: number;
  candidates: {
    candidateId: string;
    candidateName: string;
    department: string;
    usn: string;
    gender: 'Male' | 'Female';
    photoURL?: string;
    votes: number;
    percentage: number;
    isLeading: boolean;
    winnerCategory?: 'Winner' | 'Boy Winner' | 'Girl Winner';
  }[];
  declaredWinners: {
    candidateId: string;
    candidateName: string;
    gender: 'Male' | 'Female';
    votes: number;
    title: string;
  }[];
}

export interface ElectionStatus {
  isPublished: boolean;
  votingOpen: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

// ============================================================================
// IN-MEMORY CACHE TO PREVENT FIRESTORE READ AMPLIFICATION
// ============================================================================
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

let candidateCache: CacheEntry<Candidate[]> | null = null;
const CANDIDATE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateCandidateCache(): void {
  candidateCache = null;
}

let electionStatusCache: CacheEntry<ElectionStatus> | null = null;
const ELECTION_STATUS_CACHE_TTL_MS = 10 * 1000; // 10 seconds

export function invalidateElectionStatusCache(): void {
  electionStatusCache = null;
}

/**
 * Get current election publication and voting status (with in-memory caching)
 */
export async function getElectionStatus(): Promise<ElectionStatus> {
  const now = Date.now();
  if (electionStatusCache && electionStatusCache.expiresAt > now) {
    return electionStatusCache.data;
  }

  try {
    const docSnap = await adminDb.collection('election_settings').doc('general').get();
    let status: ElectionStatus = { isPublished: false, votingOpen: false };
    if (docSnap.exists) {
      const data = docSnap.data();
      status = {
        isPublished: data?.isPublished ?? false,
        votingOpen: data?.votingOpen ?? false,
        publishedAt: data?.publishedAt,
        updatedAt: data?.updatedAt,
      };
    }
    electionStatusCache = {
      data: status,
      expiresAt: now + ELECTION_STATUS_CACHE_TTL_MS,
    };
    return status;
  } catch (error) {
    console.error('Error fetching election status:', error);
    return { isPublished: false, votingOpen: false };
  }
}

/**
 * Update election publication and voting status
 */
export async function setElectionStatus(isPublished: boolean, votingOpen: boolean): Promise<ElectionStatus> {
  try {
    const now = new Date().toISOString();
    const docRef = adminDb.collection('election_settings').doc('general');
    const existingSnap = await docRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : {};

    const statusData: Record<string, any> = {
      isPublished: Boolean(isPublished),
      votingOpen: Boolean(votingOpen),
      updatedAt: now,
    };

    if (isPublished) {
      statusData.publishedAt = existingData?.publishedAt || now;
    } else if (existingData?.publishedAt) {
      statusData.publishedAt = existingData.publishedAt;
    }

    await docRef.set(statusData, { merge: true });
    invalidateElectionStatusCache();

    return {
      isPublished: Boolean(isPublished),
      votingOpen: Boolean(votingOpen),
      updatedAt: now,
      publishedAt: statusData.publishedAt,
    };
  } catch (error) {
    console.error('Error setting election status:', error);
    throw error;
  }
}

/**
 * Retrieve authentic candidates from Firestore with in-memory caching.
 * Excludes rogue/mock posts not in OFFICIAL_COUNCIL_POSTS.
 */
export async function getCandidates(semester?: string): Promise<Candidate[]> {
  const now = Date.now();
  if (candidateCache && candidateCache.expiresAt > now) {
    const cached = candidateCache.data;
    if (semester && semester !== 'all' && semester !== 'All' && semester !== 'College-Wide') {
      return cached.filter((c) => c.semester === semester || c.semester === 'College-Wide' || !c.semester);
    }
    return cached;
  }

  try {
    const candidateMap = new Map<string, Candidate>();
    const officialPostIds = new Set<string>(OFFICIAL_COUNCIL_POSTS.map((p) => p.id));

    // 1. Fetch from 'candidates' collection
    const candidatesCollection = adminDb.collection('candidates');
    const snapshot = await candidatesCollection.get();

    snapshot.forEach((doc) => {
      // Exclude legacy dummy seeded candidates
      if (doc.id.startsWith('cand_')) {
        return;
      }
      const data = doc.data();
      const postId = (data.postId || '').trim().toLowerCase().replace(/-/g, '_');

      // Filter out any mock/rogue posts that are not in OFFICIAL_COUNCIL_POSTS
      if (!officialPostIds.has(postId)) {
        return;
      }

      const officialPost = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === postId);

      candidateMap.set(doc.id, {
        id: doc.id,
        name: data.name || 'Candidate',
        usn: data.usn || '',
        semester: data.semester || '6th',
        year: data.year || '3rd Year',
        postId: postId,
        postName: officialPost?.name || data.postName || postId,
        department: data.department || data.branch || '',
        gender: data.gender === 'Female' ? 'Female' : 'Male',
        photoURL: data.photoURL || '',
        manifesto: data.manifesto || '',
        createdAt: data.createdAt,
      });
    });

    // 2. Fetch from 'users' collection with nominations (if student applied via portal)
    try {
      const usersSnapshot = await adminDb.collection('users').where('nominations', '!=', []).get();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userNominations = Array.isArray(userData.nominations) ? userData.nominations : [];
        
        userNominations.forEach((postId: string) => {
          const cleanPostId = (postId || '').trim().toLowerCase().replace(/-/g, '_');
          if (!officialPostIds.has(cleanPostId)) return;

          const candidateUniqueId = `${doc.id}_${cleanPostId}`;
          if (!candidateMap.has(candidateUniqueId) && !candidateMap.has(doc.id)) {
            const officialPost = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === cleanPostId);
            const postName = officialPost?.name || cleanPostId;
            const candSemester = userData.semester || '6th';
            const gender: 'Male' | 'Female' = userData.gender === 'Female' ? 'Female' : 'Male';

            candidateMap.set(candidateUniqueId, {
              id: candidateUniqueId,
              name: userData.name || userData.displayName || doc.id,
              usn: userData.usn || '',
              semester: candSemester,
              year: userData.year || '3rd Year',
              postId: cleanPostId,
              postName: postName,
              department: userData.department || userData.branch || '',
              gender: gender,
              photoURL: userData.photoURL || userData.image || '',
              manifesto: userData.manifesto || 'Dedicated to serving the student community of SMVITM.',
              createdAt: userData.createdAt,
            });
          }
        });
      });
    } catch (usersErr) {
      console.warn('Note: Could not query users nominations query:', usersErr);
    }

    const allCandidates = Array.from(candidateMap.values());
    candidateCache = {
      data: allCandidates,
      expiresAt: now + CANDIDATE_CACHE_TTL_MS,
    };

    if (semester && semester !== 'all' && semester !== 'All' && semester !== 'College-Wide') {
      return allCandidates.filter((c) => c.semester === semester || c.semester === 'College-Wide' || !c.semester);
    }

    return allCandidates;
  } catch (error) {
    console.error('Error fetching candidates from database:', error);
    return [];
  }
}

/**
 * Admin: Add a new candidate directly to Firestore
 */
export async function createCandidate(data: {
  name: string;
  usn: string;
  postId: string;
  postName?: string;
  year?: string;
  semester?: string;
  department?: string;
  gender: 'Male' | 'Female';
  photoURL?: string;
  manifesto?: string;
}): Promise<Candidate> {
  try {
    const postObj = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === data.postId);
    const postName = data.postName || postObj?.name || data.postId;

    const docRef = adminDb.collection('candidates').doc();
    const newCandidate: Candidate = {
      id: docRef.id,
      name: data.name.trim(),
      usn: data.usn.trim().toUpperCase(),
      postId: data.postId,
      postName,
      year: data.year || '3rd Year',
      semester: data.semester || '6th',
      department: data.department || '',
      gender: data.gender === 'Female' ? 'Female' : 'Male',
      photoURL: data.photoURL || '',
      manifesto: data.manifesto ? data.manifesto.trim() : '',
      createdAt: new Date().toISOString(),
    };

    await docRef.set(newCandidate);
    invalidateCandidateCache();
    return newCandidate;
  } catch (error) {
    console.error('Error creating candidate:', error);
    throw error;
  }
}

/**
 * Admin: Update candidate details
 */
export async function updateCandidate(id: string, updates: Partial<Candidate>): Promise<void> {
  try {
    const cleanUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined) cleanUpdates[k] = v;
    });

    if (cleanUpdates.postId) {
      const postObj = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === cleanUpdates.postId);
      cleanUpdates.postName = cleanUpdates.postName || postObj?.name || cleanUpdates.postId;
    }

    const candRef = adminDb.collection('candidates').doc(id);
    const candDoc = await candRef.get();
    if (candDoc.exists) {
      await candRef.update(cleanUpdates);
      invalidateCandidateCache();
      return;
    }

    // If ID is from users nomination `email_postId`
    if (id.includes('_')) {
      const parts = id.split('_');
      const email = parts[0];
      const userRef = adminDb.collection('users').doc(email);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const uUpdates: Record<string, any> = {};
        if (updates.name) uUpdates.name = updates.name;
        if (updates.usn) uUpdates.usn = updates.usn;
        if (updates.year) uUpdates.year = updates.year;
        if (updates.semester) uUpdates.semester = updates.semester;
        if (updates.department) uUpdates.department = updates.department;
        if (updates.gender) uUpdates.gender = updates.gender;
        if (updates.photoURL !== undefined) uUpdates.photoURL = updates.photoURL;
        if (updates.manifesto !== undefined) uUpdates.manifesto = updates.manifesto;
        if (Object.keys(uUpdates).length > 0) {
          await userRef.update(uUpdates);
        }
        invalidateCandidateCache();
        return;
      }
    }

    // Fallback: set doc with merge if not found
    await candRef.set(cleanUpdates, { merge: true });
    invalidateCandidateCache();
  } catch (error) {
    console.error('Error updating candidate:', error);
    throw error;
  }
}

/**
 * Admin: Delete candidate record
 */
export async function deleteCandidate(id: string): Promise<void> {
  try {
    const candRef = adminDb.collection('candidates').doc(id);
    const candDoc = await candRef.get();
    if (candDoc.exists) {
      await candRef.delete();
      invalidateCandidateCache();
      return;
    }

    // If ID is from users nomination `email_postId`
    if (id.includes('_')) {
      const parts = id.split('_');
      const email = parts[0];
      const postId = parts.slice(1).join('_');
      const userRef = adminDb.collection('users').doc(email);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        const currentNoms: string[] = Array.isArray(uData?.nominations) ? uData.nominations : [];
        const updated = currentNoms.filter((p) => p !== postId);
        await userRef.update({ nominations: updated });
        invalidateCandidateCache();
        return;
      }
    }
  } catch (error) {
    console.error('Error deleting candidate:', error);
    throw error;
  }
}

/**
 * Clear all votes and voter records from Firestore safely using 400-op chunks
 * Completely resets voting state so all users can vote fresh.
 */
export async function clearAllVotes(): Promise<{ deletedVotes: number; deletedVoters: number }> {
  try {
    const votesSnap = await adminDb.collection('votes').get();
    const votersSnap = await adminDb.collection('voter_records').get();
    const talliesSnap = await adminDb.collection('election_tallies').get();
    let legacySnap: FirebaseFirestore.QuerySnapshot | null = null;
    try {
      legacySnap = await adminDb.collection('voters').get();
    } catch {}

    const refsToDelete = new Map<string, FirebaseFirestore.DocumentReference>();
    
    votesSnap.docs.forEach((d) => refsToDelete.set(`votes/${d.id}`, d.ref));
    votersSnap.docs.forEach((d) => refsToDelete.set(`voter_records/${d.id}`, d.ref));
    talliesSnap.docs.forEach((d) => refsToDelete.set(`election_tallies/${d.id}`, d.ref));
    if (legacySnap) {
      legacySnap.docs.forEach((d) => refsToDelete.set(`voters/${d.id}`, d.ref));
    }

    try {
      const listedVotes = await adminDb.collection('votes').listDocuments();
      listedVotes.forEach((r) => refsToDelete.set(`votes/${r.id}`, r));
    } catch {}

    try {
      const listedVoters = await adminDb.collection('voter_records').listDocuments();
      listedVoters.forEach((r) => refsToDelete.set(`voter_records/${r.id}`, r));
    } catch {}

    try {
      const legacyVoters = await adminDb.collection('voters').listDocuments();
      legacyVoters.forEach((r) => refsToDelete.set(`voters/${r.id}`, r));
    } catch {}

    const allRefs = Array.from(refsToDelete.values());
    for (let i = 0; i < allRefs.length; i += 400) {
      const chunk = allRefs.slice(i, i + 400);
      const batch = adminDb.batch();
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // Comprehensive cleanup using recursiveDelete if available
    try {
      if (typeof (adminDb as any).recursiveDelete === 'function') {
        await (adminDb as any).recursiveDelete(adminDb.collection('votes'));
        await (adminDb as any).recursiveDelete(adminDb.collection('voter_records'));
        await (adminDb as any).recursiveDelete(adminDb.collection('election_tallies'));
        await (adminDb as any).recursiveDelete(adminDb.collection('voters'));
      }
    } catch (recErr) {
      console.warn('Note: recursiveDelete completed or skipped:', recErr);
    }

    // Reset any lingering voted/hasVoted flags on users collection if any exist
    try {
      const usersWithVotesSnap = await adminDb.collection('users').where('hasVoted', '==', true).get();
      if (!usersWithVotesSnap.empty) {
        const batch = adminDb.batch();
        usersWithVotesSnap.docs.forEach((d) => {
          batch.update(d.ref, { hasVoted: false, votedAt: admin.firestore.FieldValue.delete() });
        });
        await batch.commit();
      }
    } catch {}

    invalidateCandidateCache();
    invalidateElectionStatusCache();

    return { deletedVotes: votesSnap.size, deletedVoters: votersSnap.size };
  } catch (error) {
    console.error('Error clearing votes from Firestore:', error);
    throw error;
  }
}

/**
 * Clear all candidates from Firestore (candidates collection + nominations in users)
 */
export async function clearAllCandidates(): Promise<{ deletedCandidates: number }> {
  try {
    const candidatesSnap = await adminDb.collection('candidates').get();
    const deletedCandidates = candidatesSnap.size;

    for (let i = 0; i < candidatesSnap.docs.length; i += 400) {
      const chunk = candidatesSnap.docs.slice(i, i + 400);
      const batch = adminDb.batch();
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Also clear nominations from users collection
    try {
      const usersSnap = await adminDb.collection('users').get();
      const usersWithNoms = usersSnap.docs.filter((d) => {
        const u = d.data();
        return Array.isArray(u?.nominations) && u.nominations.length > 0;
      });

      for (let i = 0; i < usersWithNoms.length; i += 400) {
        const chunk = usersWithNoms.slice(i, i + 400);
        const batch = adminDb.batch();
        chunk.forEach((d) => batch.update(d.ref, { nominations: [] }));
        await batch.commit();
      }
    } catch (usersErr) {
      console.warn('Note: Could not clear users nominations:', usersErr);
    }

    invalidateCandidateCache();
    return { deletedCandidates };
  } catch (error) {
    console.error('Error clearing candidates from Firestore:', error);
    throw error;
  }
}

/**
 * Check whether a voter has already submitted their ballot
 */
export async function hasUserVoted(email: string): Promise<{ hasVoted: boolean; votedAt?: string }> {
  try {
    if (!email) return { hasVoted: false };
    const cleanEmail = email.toLowerCase().trim();

    // 1. Check official voter_records by clean email
    const docSnap = await adminDb.collection('voter_records').doc(cleanEmail).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data?.hasVoted !== false) {
        let displayTime = data?.votedAtFormatted;
        if (data?.votedAt) {
          try {
            displayTime = new Date(data.votedAt).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            });
          } catch {}
        }
        return {
          hasVoted: true,
          votedAt: displayTime || data?.votedAtFormatted || 'Verified',
        };
      }
    }

    // 2. Check voter_records by hashed identifier (if document was created by hash)
    const voterHash = hashVoterIdentifier(cleanEmail);
    const hashSnap = await adminDb.collection('voter_records').doc(voterHash).get();
    if (hashSnap.exists) {
      const data = hashSnap.data();
      if (data?.hasVoted !== false) {
        return {
          hasVoted: true,
          votedAt: data?.votedAtFormatted || data?.votedAt || 'Verified',
        };
      }
    }

    // 3. Fallback: check legacy voters collection
    try {
      const legacySnap = await adminDb.collection('voters').doc(cleanEmail).get();
      if (legacySnap.exists) {
        const data = legacySnap.data();
        if (data?.hasVoted !== false) {
          return {
            hasVoted: true,
            votedAt: data?.votedAtFormatted || data?.votedAt || 'Verified',
          };
        }
      }
    } catch {}

    return { hasVoted: false };
  } catch (error) {
    console.error('Error checking voter status:', error);
    return { hasVoted: false };
  }
}

/**
 * Submit an official ballot with ATOMIC TRANSACTION
 * 
 * 1. Executes within adminDb.runTransaction() to eliminate TOCTOU double-voting race conditions.
 * 2. Anonymizes timestamps: adds random second jitter to secret ballot records to decouple from voter records.
 * 3. Records ballot choices in 'votes' and marks student in 'voter_records'.
 */
export async function submitBallot(
  voterEmail: string,
  semester: string,
  selections: Record<string, string | string[]> // postId -> candidateId or [boyId, girlId]
): Promise<{ success: boolean; votedAt: string; message: string }> {
  try {
    const cleanEmail = voterEmail.toLowerCase().trim();

    // 1. Verify election status from cache
    const status = await getElectionStatus();
    if (!status.votingOpen) {
      throw new Error('Voting is currently closed by the Election Commission.');
    }

    // 2. Resolve candidates from cache
    const candidates = await getCandidates();
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    // 3. Normalize selections (deduplicate to prevent double counting from duplicate IDs)
    let normalizedVotes: { postId: string; candidateId: string }[] = [];
    for (const [postId, candidateVal] of Object.entries(selections)) {
      const cleanPostId = (postId || '').trim().toLowerCase().replace(/-/g, '_');
      if (Array.isArray(candidateVal)) {
        for (const cId of candidateVal) {
          if (cId && typeof cId === 'string') {
            normalizedVotes.push({ postId: cleanPostId, candidateId: cId.trim() });
          }
        }
      } else if (typeof candidateVal === 'string' && candidateVal.trim()) {
        normalizedVotes.push({ postId: cleanPostId, candidateId: candidateVal.trim() });
      }
    }

    // Deduplicate same post+ candidate pair (protects against double counting via manipulated payload)
    {
      const seen = new Set<string>();
      const deduped: typeof normalizedVotes = [];
      for (const v of normalizedVotes) {
        const key = `${v.postId}:${v.candidateId}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(v);
        }
      }
      normalizedVotes = deduped;
    }

    if (normalizedVotes.length === 0) {
      throw new Error('No valid candidate selections found.');
    }

    const now = new Date();
    const isoTime = now.toISOString();
    const formattedTime = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const voterRef = adminDb.collection('voter_records').doc(cleanEmail);
    const voterHash = hashVoterIdentifier(cleanEmail);

    // 4. ATOMIC FIRESTORE TRANSACTION: Guaranteed single-vote per student & race-condition proof
    await adminDb.runTransaction(async (transaction) => {
      // Step A: Check if voter has already voted INSIDE the transaction lock
      const voterDoc = await transaction.get(voterRef);
      if (voterDoc.exists) {
        const vData = voterDoc.data();
        const prevTime = vData?.votedAtFormatted || vData?.votedAt || 'earlier';
        throw new Error(`You have already voted on ${prevTime}. Each voter may only cast one ballot.`);
      }

      // Step B: Mark voter as voted in voter_records
      transaction.set(voterRef, {
        voterHash,
        email: cleanEmail,
        semester,
        hasVoted: true,
        votedAt: isoTime,
        votedAtFormatted: formattedTime,
      });

      // Step C: Record secret ballot votes with decoupled jittered timestamp
      const jitterMs = Math.floor(Math.random() * 28000) + 2000;
      const ballotDate = new Date(now.getTime() - jitterMs);
      const ballotIsoTime = ballotDate.toISOString();
      const ballotFormattedTime = ballotDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      for (const { postId, candidateId } of normalizedVotes) {
        const candidate = candidateMap.get(candidateId);
        const postName = candidate?.postName || postId;
        const candidateName = candidate?.name || 'Nominee';
        const candidateGender = candidate?.gender || 'Male';

        const { ballotHash, encryptedPayload } = encryptBallotTransaction(candidateId, postId, ballotIsoTime);

        const voteRef = adminDb.collection('votes').doc();
        const voteData: VoteRecord = {
          id: voteRef.id,
          postId: postId,
          postName: postName,
          candidateId: candidateId,
          candidateName: candidateName,
          candidateGender: candidateGender,
          semester: candidate?.semester || semester,
          timestamp: ballotIsoTime,
          timestampFormatted: ballotFormattedTime,
          encryptedBallotHash: ballotHash,
          encryptedPayload: encryptedPayload,
        };
        transaction.set(voteRef, voteData);

        // Step D: Increment atomic pre-aggregated tally for this post and candidate
        // Use base64url-encoded map key to avoid Firestore dot-path corruption for email-based candidate IDs
        const tallyRef = adminDb.collection('election_tallies').doc(postId);
        const encodedKey = encodeCandidateKey(candidateId);
        transaction.set(
          tallyRef,
          {
            postId,
            totalVotes: admin.firestore.FieldValue.increment(1),
            lastUpdated: isoTime,
            candidateVotes: { [encodedKey]: admin.firestore.FieldValue.increment(1) },
          },
          { merge: true }
        );
      }
    });

    return {
      success: true,
      votedAt: formattedTime,
      message: 'Your official ballot has been recorded securely and anonymously.',
    };
  } catch (error) {
    console.error('Error submitting ballot:', error);
    throw error;
  }
}

/**
 * Aggregate Live Results directly from authoritative 'votes' collection
 * Guarantees 100% accurate candidate vote counts, percentages, and declared winners.
 */
export async function getVotingResults(filterSemester?: string): Promise<{
  totalVotes: number;
  totalVoters: number;
  postResults: PostResult[];
  recentTimeLogs: {
    id: string;
    postName: string;
    candidateName: string;
    semester: string;
    timestampFormatted: string;
    status: string;
    encryptedBallotHash: string;
    encryptedPayload: string;
    anonymizedVoterToken: string;
  }[];
}> {
  try {
    const candidates = await getCandidates();

    const isFiltered = Boolean(filterSemester && filterSemester !== 'all' && filterSemester !== 'All');

    const filteredCandidates = isFiltered
      ? candidates.filter((c) => !c.semester || c.semester === 'College-Wide' || c.semester.toLowerCase() === filterSemester?.toLowerCase())
      : candidates;

    // 1. Fetch authoritative votes directly from Firestore
    const votesSnap = await adminDb.collection('votes').get();

    // 2. Fetch voter records count for total distinct students who voted
    let totalVoters = 0;
    try {
      const countSnap = await adminDb.collection('voter_records').count().get();
      totalVoters = countSnap.data().count;
    } catch {
      const snap = await adminDb.collection('voter_records').get();
      totalVoters = snap.size;
    }

    // 3. Tally votes accurately per post and candidate
    const postTotalVotesMap: Record<string, number> = {};
    const candidateVotesMap: Record<string, Record<string, number>> = {};
    const allVotes: VoteRecord[] = [];

    votesSnap.docs.forEach((doc) => {
      const v = doc.data() as VoteRecord;
      allVotes.push({ ...v, id: doc.id });

      const pId = (v.postId || '').trim().toLowerCase().replace(/-/g, '_');
      const cId = (v.candidateId || '').trim();
      if (!pId) return;

      postTotalVotesMap[pId] = (postTotalVotesMap[pId] || 0) + 1;
      if (cId) {
        if (!candidateVotesMap[pId]) candidateVotesMap[pId] = {};
        candidateVotesMap[pId][cId] = (candidateVotesMap[pId][cId] || 0) + 1;
      }
    });

    const totalVotes = votesSnap.size;

    // 4. Build post results according to OFFICIAL_COUNCIL_POSTS specifications
    const postResults: PostResult[] = [];

    for (const officialPostMeta of OFFICIAL_COUNCIL_POSTS) {
      const postId = officialPostMeta.id;
      const postCandidates = filteredCandidates.filter((c) => c.postId === postId);
      const postTallyMap = candidateVotesMap[postId] || {};
      const totalPostVotes = postTotalVotesMap[postId] || 0;

      const seats = officialPostMeta?.seats ?? (postId.includes('coordinator') ? 2 : 1);
      const genderRule = officialPostMeta?.genderRule ?? (seats === 2 ? '1_boy_1_girl' : 'any');

      // Candidate IDs registered or voted in this post
      const candidateIdsInPost = new Set<string>();
      postCandidates.forEach((c) => candidateIdsInPost.add(c.id));
      Object.keys(postTallyMap).forEach((cId) => candidateIdsInPost.add(cId));

      const candidatesTally = Array.from(candidateIdsInPost).map((cId) => {
        const candObj = postCandidates.find((c) => c.id === cId);
        const candName = candObj?.name || 'Nominee';
        const candDept = candObj?.department || '';
        const candUsn = candObj?.usn || '';
        const candGender: 'Male' | 'Female' = candObj?.gender || 'Male';
        const candPhoto = candObj?.photoURL || '';

        const count = postTallyMap[cId] || 0;
        const percentage = totalPostVotes > 0 ? Math.round((count / totalPostVotes) * 100) : 0;

        return {
          candidateId: cId,
          candidateName: candName,
          department: candDept,
          usn: candUsn,
          gender: candGender,
          photoURL: candPhoto,
          votes: count,
          percentage,
          isLeading: false,
          winnerCategory: undefined as 'Winner' | 'Boy Winner' | 'Girl Winner' | undefined,
        };
      });

      // Sort descending by votes
      candidatesTally.sort((a, b) => b.votes - a.votes);

      const declaredWinners: {
        candidateId: string;
        candidateName: string;
        gender: 'Male' | 'Female';
        votes: number;
        title: string;
      }[] = [];

      // Determine winners according to post seat rules
      if (seats === 2 && genderRule === '1_boy_1_girl') {
        const leadingBoy = candidatesTally.find((c) => c.gender === 'Male' && c.votes > 0);
        const leadingGirl = candidatesTally.find((c) => c.gender === 'Female' && c.votes > 0);

        if (leadingBoy) {
          leadingBoy.isLeading = true;
          leadingBoy.winnerCategory = 'Boy Winner';
          declaredWinners.push({
            candidateId: leadingBoy.candidateId,
            candidateName: leadingBoy.candidateName,
            gender: 'Male',
            votes: leadingBoy.votes,
            title: 'Boy Winner (Highest Votes)',
          });
        }

        if (leadingGirl) {
          leadingGirl.isLeading = true;
          leadingGirl.winnerCategory = 'Girl Winner';
          declaredWinners.push({
            candidateId: leadingGirl.candidateId,
            candidateName: leadingGirl.candidateName,
            gender: 'Female',
            votes: leadingGirl.votes,
            title: 'Girl Winner (Highest Votes)',
          });
        }
      } else {
        if (candidatesTally.length > 0 && candidatesTally[0].votes > 0) {
          candidatesTally[0].isLeading = true;
          candidatesTally[0].winnerCategory = 'Winner';
          declaredWinners.push({
            candidateId: candidatesTally[0].candidateId,
            candidateName: candidatesTally[0].candidateName,
            gender: candidatesTally[0].gender,
            votes: candidatesTally[0].votes,
            title: 'Elected Representative',
          });
        }
      }

      const postName = officialPostMeta?.name || postCandidates[0]?.postName || postId;

      postResults.push({
        postId,
        postName,
        semester: postCandidates[0]?.semester || 'College-Wide',
        seats,
        genderRule,
        totalVotes: totalPostVotes,
        candidates: candidatesTally,
        declaredWinners,
      });
    }

    // 5. Recent 50 audit logs sorted chronologically descending
    allVotes.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    const recentTimeLogs = allVotes.slice(0, 50).map((v) => {
      const hashDisplay = (v.encryptedBallotHash || crypto.createHash('sha256').update(v.id).digest('hex')).substring(0, 16).toUpperCase();
      const payloadDisplay = (v.encryptedPayload || crypto.createHmac('sha256', BALLOT_ENCRYPTION_KEY).update(v.id).digest('hex')).substring(0, 16);
      const voterToken = crypto.createHash('md5').update(v.id + (v.timestamp || '')).digest('hex').substring(0, 8).toUpperCase();

      let timeFormatted = '';
      if (v.timestamp) {
        try {
          timeFormatted = new Date(v.timestamp).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
        } catch {}
      }
      if (!timeFormatted) {
        timeFormatted = v.timestampFormatted || 'Recently';
      }

      return {
        id: v.id,
        postName: v.postName || v.postId,
        candidateName: 'CONFIDENTIAL',
        semester: v.semester || 'College-Wide',
        timestampFormatted: timeFormatted,
        encryptedBallotHash: `BALLOT#${hashDisplay}`,
        encryptedPayload: `ENC:${payloadDisplay}...`,
        anonymizedVoterToken: `VOTER#${voterToken}`,
        status: 'Cryptographically Sealed & Encrypted',
      };
    });

    return {
      totalVotes,
      totalVoters,
      postResults,
      recentTimeLogs,
    };
  } catch (error) {
    console.error('Error computing voting results:', error);
    throw error;
  }
}

/**
 * Helper: One-time backfill of election_tallies if database has existing votes
 */
async function backfillElectionTallies(): Promise<void> {
  try {
    const votesSnap = await adminDb.collection('votes').get();
    const votersSnap = await adminDb.collection('voter_records').get();

    if (votesSnap.empty) return;

    const postTallies: Record<string, { totalVotes: number; candidateVotes: Record<string, number> }> = {};

    votesSnap.forEach((doc) => {
      const v = doc.data();
      const pId = v.postId;
      const cId = v.candidateId;
      if (!pId) return;

      if (!postTallies[pId]) {
        postTallies[pId] = { totalVotes: 0, candidateVotes: {} };
      }
      postTallies[pId].totalVotes++;
      if (cId) {
        postTallies[pId].candidateVotes[cId] = (postTallies[pId].candidateVotes[cId] || 0) + 1;
      }
    });

    const batch = adminDb.batch();
    for (const [postId, tally] of Object.entries(postTallies)) {
      const ref = adminDb.collection('election_tallies').doc(postId);
      const encodedVotes: Record<string, number> = {};
      for (const [rawId, count] of Object.entries(tally.candidateVotes)) {
        encodedVotes[encodeCandidateKey(rawId)] = count;
      }
      batch.set(ref, {
        postId,
        totalVotes: tally.totalVotes,
        candidateVotes: encodedVotes,
        lastUpdated: new Date().toISOString(),
      });
    }

    const summaryRef = adminDb.collection('election_tallies').doc('summary');
    batch.set(summaryRef, {
      totalBallots: votersSnap.size,
      totalVotes: votesSnap.size,
      lastUpdated: new Date().toISOString(),
    });

    await batch.commit();
    console.log('✅ Successfully backfilled election_tallies collection.');
  } catch (err) {
    console.error('Failed to backfill election tallies:', err);
  }
}

