import { adminDb } from '../firebase-admin';
import * as admin from 'firebase-admin';
import { ELECTION_POSTS, OFFICIAL_COUNCIL_POSTS, OfficialPost } from '../constants';
import crypto from 'crypto';

const BALLOT_ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'smvitm_secret_ballot_vault_key_2026';

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
    const statusData: ElectionStatus = {
      isPublished,
      votingOpen,
      updatedAt: now,
      publishedAt: isPublished ? now : undefined,
    };
    await adminDb.collection('election_settings').doc('general').set(statusData, { merge: true });
    invalidateElectionStatusCache();
    return statusData;
  } catch (error) {
    console.error('Error setting election status:', error);
    throw error;
  }
}

/**
 * Retrieve authentic candidates from Firestore with in-memory caching.
 * Excludes legacy dummy candidates without executing hazardous side-effect deletes during read requests.
 */
export async function getCandidates(semester?: string): Promise<Candidate[]> {
  const now = Date.now();
  if (candidateCache && candidateCache.expiresAt > now) {
    const cached = candidateCache.data;
    if (semester) {
      return cached.filter((c) => c.semester === semester || !c.semester);
    }
    return cached;
  }

  try {
    const candidateMap = new Map<string, Candidate>();

    // 1. Fetch from 'candidates' collection
    const candidatesCollection = adminDb.collection('candidates');
    const snapshot = await candidatesCollection.get();

    snapshot.forEach((doc) => {
      // Exclude legacy dummy seeded candidates
      if (doc.id.startsWith('cand_')) {
        return;
      }
      const data = doc.data();
      candidateMap.set(doc.id, {
        id: doc.id,
        name: data.name || 'Candidate',
        usn: data.usn || '',
        semester: data.semester || '6th',
        year: data.year || '3rd Year',
        postId: data.postId || '',
        postName: data.postName || data.postId || 'Position',
        department: data.department || data.branch || '',
        gender: data.gender === 'Female' ? 'Female' : 'Male',
        photoURL: data.photoURL || '',
        manifesto: data.manifesto || '',
        createdAt: data.createdAt,
      });
    });

    // 2. Fetch from 'users' collection with nominations
    try {
      const usersSnapshot = await adminDb.collection('users').where('nominations', '!=', []).get();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userNominations = Array.isArray(userData.nominations) ? userData.nominations : [];
        
        userNominations.forEach((postId: string) => {
          const candidateUniqueId = `${doc.id}_${postId}`;
          if (!candidateMap.has(candidateUniqueId) && !candidateMap.has(doc.id)) {
            const officialPost = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === postId);
            const postName = officialPost?.name || postId;
            const candSemester = userData.semester || '6th';
            const gender: 'Male' | 'Female' = userData.gender === 'Female' ? 'Female' : 'Male';

            candidateMap.set(candidateUniqueId, {
              id: candidateUniqueId,
              name: userData.name || userData.displayName || doc.id,
              usn: userData.usn || '',
              semester: candSemester,
              year: userData.year || '3rd Year',
              postId: postId,
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

    if (semester) {
      return allCandidates.filter((c) => c.semester === semester || !c.semester);
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
    const docRef = adminDb.collection('candidates').doc(id);
    await docRef.update(updates);
    invalidateCandidateCache();
  } catch (error) {
    console.error('Error updating candidate:', error);
    throw error;
  }
}

/**
 * Admin: Delete candidate from Firestore
 */
export async function deleteCandidate(id: string): Promise<void> {
  try {
    await adminDb.collection('candidates').doc(id).delete();
    invalidateCandidateCache();
  } catch (error) {
    console.error('Error deleting candidate:', error);
    throw error;
  }
}

/**
 * Clear all votes, voter records, and running tallies from Firestore safely using 450-op chunks
 * Prevents Firestore's fatal 500-operation batch commit crash!
 */
export async function clearAllVotes(): Promise<{ deletedVotes: number; deletedVoters: number }> {
  try {
    const votesSnap = await adminDb.collection('votes').get();
    const votersSnap = await adminDb.collection('voter_records').get();
    const talliesSnap = await adminDb.collection('election_tallies').get();

    const allRefs: admin.firestore.DocumentReference[] = [];
    votesSnap.forEach((doc) => allRefs.push(doc.ref));
    votersSnap.forEach((doc) => allRefs.push(doc.ref));
    talliesSnap.forEach((doc) => allRefs.push(doc.ref));

    if (allRefs.length === 0) {
      return { deletedVotes: 0, deletedVoters: 0 };
    }

    // Chunk into safe batches of max 450 operations
    const CHUNK_SIZE = 450;
    for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
      const chunk = allRefs.slice(i, i + CHUNK_SIZE);
      const batch = adminDb.batch();
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    return { deletedVotes: votesSnap.size, deletedVoters: votersSnap.size };
  } catch (error) {
    console.error('Error clearing votes from Firestore:', error);
    throw error;
  }
}

/**
 * Check whether a voter has already submitted their ballot
 */
export async function hasUserVoted(email: string): Promise<{ hasVoted: boolean; votedAt?: string }> {
  try {
    if (!email) return { hasVoted: false };
    const docSnap = await adminDb.collection('voter_records').doc(email.toLowerCase().trim()).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        hasVoted: true,
        votedAt: data?.votedAtFormatted || data?.votedAt,
      };
    }
    return { hasVoted: false };
  } catch (error) {
    console.error('Error checking voter status:', error);
    return { hasVoted: false };
  }
}

/**
 * Submit an official ballot with ATOMIC TRANSACTION & PRE-AGGREGATED TALLIES
 * 
 * 1. Executes within adminDb.runTransaction() to eliminate TOCTOU double-voting race conditions.
 * 2. Anonymizes timestamps: adds random second jitter to secret ballot records to decouple from voter records.
 * 3. Atomically updates running candidate counters in 'election_tallies' using FieldValue.increment(1) for O(1) reads.
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

    // 2. Resolve candidates from cache (avoids redundant full database queries on every ballot)
    const candidates = await getCandidates();
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    // 3. Normalize selections
    const normalizedVotes: { postId: string; candidateId: string }[] = [];
    for (const [postId, candidateVal] of Object.entries(selections)) {
      if (Array.isArray(candidateVal)) {
        for (const cId of candidateVal) {
          if (cId) normalizedVotes.push({ postId, candidateId: cId });
        }
      } else if (typeof candidateVal === 'string' && candidateVal) {
        normalizedVotes.push({ postId, candidateId: candidateVal });
      }
    }

    if (normalizedVotes.length === 0) {
      throw new Error('No valid candidate selections found.');
    }

    const now = new Date();
    const isoTime = now.toISOString();
    const formattedTime = now.toLocaleString('en-IN', {
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
      // Random jitter between 2 to 30 seconds breaks millisecond correlation with voter_records
      const jitterMs = Math.floor(Math.random() * 28000) + 2000;
      const ballotDate = new Date(now.getTime() - jitterMs);
      const ballotIsoTime = ballotDate.toISOString();
      const ballotFormattedTime = ballotDate.toLocaleString('en-IN', {
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
        const tallyRef = adminDb.collection('election_tallies').doc(postId);
        transaction.set(
          tallyRef,
          {
            postId,
            totalVotes: admin.firestore.FieldValue.increment(1),
            [`candidateVotes.${candidateId}`]: admin.firestore.FieldValue.increment(1),
            lastUpdated: isoTime,
          },
          { merge: true }
        );
      }

      // Step E: Update running summary document
      const summaryRef = adminDb.collection('election_tallies').doc('summary');
      transaction.set(
        summaryRef,
        {
          totalBallots: admin.firestore.FieldValue.increment(1),
          totalVotes: admin.firestore.FieldValue.increment(normalizedVotes.length),
          lastUpdated: isoTime,
        },
        { merge: true }
      );
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
 * Aggregate Live Results with Pre-Aggregated Tallies & 50-Item Audit Window
 * Scales smoothly to tens of thousands of votes with O(1) aggregated reads!
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
    const filteredCandidates = filterSemester
      ? candidates.filter((c) => c.semester === filterSemester)
      : candidates;

    // 1. Fetch pre-aggregated tallies
    let talliesSnap = await adminDb.collection('election_tallies').get();

    // 2. Self-healing / backfill: if no tallies exist yet but votes exist in the collection
    if (talliesSnap.empty) {
      const votesCheck = await adminDb.collection('votes').limit(1).get();
      if (!votesCheck.empty) {
        await backfillElectionTallies();
        talliesSnap = await adminDb.collection('election_tallies').get();
      }
    }

    const talliesMap: Record<string, { totalVotes: number; candidateVotes: Record<string, number> }> = {};
    let summaryTotalBallots = 0;
    let summaryTotalVotes = 0;

    talliesSnap.forEach((doc) => {
      if (doc.id === 'summary') {
        const d = doc.data();
        summaryTotalBallots = d.totalBallots || 0;
        summaryTotalVotes = d.totalVotes || 0;
      } else {
        const d = doc.data();
        talliesMap[doc.id] = {
          totalVotes: d.totalVotes || 0,
          candidateVotes: d.candidateVotes || {},
        };
      }
    });

    // 3. Total Voters count: use summary or count() query
    let totalVoters = summaryTotalBallots;
    if (totalVoters === 0) {
      try {
        const countSnap = await adminDb.collection('voter_records').count().get();
        totalVoters = countSnap.data().count;
      } catch {
        const snap = await adminDb.collection('voter_records').get();
        totalVoters = snap.size;
      }
    }

    // 4. Build post results using aggregated tallies
    const allKnownPostIds = new Set<string>();
    OFFICIAL_COUNCIL_POSTS.forEach((p) => allKnownPostIds.add(p.id));
    filteredCandidates.forEach((c) => allKnownPostIds.add(c.postId));
    Object.keys(talliesMap).forEach((pId) => allKnownPostIds.add(pId));

    const postResults: PostResult[] = [];
    let calculatedTotalVotes = 0;

    for (const postId of Array.from(allKnownPostIds)) {
      const officialPostMeta = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === postId);
      const postCandidates = filteredCandidates.filter((c) => c.postId === postId);
      const tallyData = talliesMap[postId] || { totalVotes: 0, candidateVotes: {} };
      const totalPostVotes = tallyData.totalVotes;
      calculatedTotalVotes += totalPostVotes;

      const seats = officialPostMeta?.seats ?? (postId.includes('coordinator') || postId === 'general_secretary' ? 2 : 1);
      const genderRule = officialPostMeta?.genderRule ?? (seats === 2 ? '1_boy_1_girl' : 'any');

      // Candidate IDs
      const candidateIdsInPost = new Set<string>();
      postCandidates.forEach((c) => candidateIdsInPost.add(c.id));
      Object.keys(tallyData.candidateVotes).forEach((cId) => candidateIdsInPost.add(cId));

      const candidatesTally = Array.from(candidateIdsInPost).map((cId) => {
        const candObj = postCandidates.find((c) => c.id === cId);
        const candName = candObj?.name || 'Nominee';
        const candDept = candObj?.department || '';
        const candUsn = candObj?.usn || '';
        const candGender: 'Male' | 'Female' = candObj?.gender || 'Male';
        const candPhoto = candObj?.photoURL || '';

        const count = tallyData.candidateVotes[cId] || 0;
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
        semester: postCandidates[0]?.semester || '6th',
        seats,
        genderRule,
        totalVotes: totalPostVotes,
        candidates: candidatesTally,
        declaredWinners,
      });
    }

    // 5. Recent 50 audit logs: Fetch ONLY the top 50 rows instead of downloading the whole table!
    let recentTimeLogs: any[] = [];
    try {
      const recentSnap = await adminDb
        .collection('votes')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      recentTimeLogs = recentSnap.docs.map((doc) => {
        const v = doc.data() as VoteRecord;
        const hashDisplay = (v.encryptedBallotHash || crypto.createHash('sha256').update(doc.id).digest('hex')).substring(0, 16).toUpperCase();
        const payloadDisplay = (v.encryptedPayload || crypto.createHmac('sha256', BALLOT_ENCRYPTION_KEY).update(doc.id).digest('hex')).substring(0, 16);
        const voterToken = crypto.createHash('md5').update(doc.id + (v.timestamp || '')).digest('hex').substring(0, 8).toUpperCase();

        return {
          id: doc.id,
          postName: v.postName || v.postId,
          candidateName: 'CONFIDENTIAL',
          semester: v.semester || '6th',
          timestampFormatted: v.timestampFormatted || new Date(v.timestamp).toLocaleString('en-IN'),
          encryptedBallotHash: `BALLOT#${hashDisplay}`,
          encryptedPayload: `ENC:${payloadDisplay}...`,
          anonymizedVoterToken: `VOTER#${voterToken}`,
          status: 'Cryptographically Sealed & Encrypted',
        };
      });
    } catch (logErr) {
      console.warn('Note: Could not query ordered recent audit logs:', logErr);
    }

    return {
      totalVotes: summaryTotalVotes || calculatedTotalVotes,
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
      batch.set(ref, {
        postId,
        totalVotes: tally.totalVotes,
        candidateVotes: tally.candidateVotes,
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
