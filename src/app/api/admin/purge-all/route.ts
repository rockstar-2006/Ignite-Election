import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getActiveAdminSession } from '@/lib/server/admin-auth';
import { invalidateCandidateCache, invalidateElectionStatusCache } from '@/lib/server/voting';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify active admin session
    const activeSession = await getActiveAdminSession();
    if (!activeSession.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid Election Commission admin session required.' },
        { status: 401 }
      );
    }

    // Optional: verify matching sessionId if client provided it
    try {
      const body = await request.json();
      if (body?.sessionId && activeSession.activeSessionId && body.sessionId !== activeSession.activeSessionId) {
        return NextResponse.json({ error: 'Session mismatch or expired.' }, { status: 403 });
      }
    } catch {
      // Body may be empty on simple POST
    }

    // 2. Fetch documents across all election collections
    const votesSnap = await adminDb.collection('votes').get();
    const votersSnap = await adminDb.collection('voter_records').get();
    const candidatesSnap = await adminDb.collection('candidates').get();
    const talliesSnap = await adminDb.collection('election_tallies').get();

    const allRefs: { ref: FirebaseFirestore.DocumentReference; type: string }[] = [];
    votesSnap.forEach((doc) => allRefs.push({ ref: doc.ref, type: 'vote' }));
    votersSnap.forEach((doc) => allRefs.push({ ref: doc.ref, type: 'voter' }));
    candidatesSnap.forEach((doc) => allRefs.push({ ref: doc.ref, type: 'candidate' }));
    talliesSnap.forEach((doc) => allRefs.push({ ref: doc.ref, type: 'tally' }));

    // 3. Chunk batch deletions into max 450 operations per batch (Firestore limit is 500)
    const CHUNK_SIZE = 450;
    for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
      const chunk = allRefs.slice(i, i + CHUNK_SIZE);
      const batch = adminDb.batch();
      chunk.forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }

    // 4. Invalidate in-memory caches
    invalidateCandidateCache();
    invalidateElectionStatusCache();

    return NextResponse.json({
      success: true,
      message: `Complete database wipe successful: ${votesSnap.size} ballot(s), ${votersSnap.size} voter record(s), and ${candidatesSnap.size} candidate record(s) permanently removed.`,
      votesDeleted: votesSnap.size,
      votersDeleted: votersSnap.size,
      candidatesDeleted: candidatesSnap.size,
    });
  } catch (error: any) {
    console.error('Error purging election database:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to purge database.' },
      { status: 500 }
    );
  }
}
