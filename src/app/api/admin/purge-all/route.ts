import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const votesSnap = await adminDb.collection('votes').get();
    const votersSnap = await adminDb.collection('voter_records').get();
    const candidatesSnap = await adminDb.collection('candidates').get();

    const batch = adminDb.batch();
    let votesDeleted = 0;
    votesSnap.forEach((doc) => {
      batch.delete(doc.ref);
      votesDeleted++;
    });

    let votersDeleted = 0;
    votersSnap.forEach((doc) => {
      batch.delete(doc.ref);
      votersDeleted++;
    });

    let candidatesDeleted = 0;
    candidatesSnap.forEach((doc) => {
      batch.delete(doc.ref);
      candidatesDeleted++;
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Complete database wipe successful: ${votesDeleted} ballot(s), ${votersDeleted} voter record(s), and ${candidatesDeleted} candidate record(s) permanently removed.`,
      votesDeleted,
      votersDeleted,
      candidatesDeleted,
    });
  } catch (error: any) {
    console.error('Error purging election database:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to purge database.' },
      { status: 500 }
    );
  }
}
