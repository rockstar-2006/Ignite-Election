import { NextRequest, NextResponse } from 'next/server';
import { clearAllVotes } from '@/lib/server/voting';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    let email: string | undefined;
    try {
      const body = await request.json();
      email = body?.email;
    } catch {}

    const { searchParams } = new URL(request.url);
    if (!email) {
      email = searchParams.get('email') || undefined;
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      await adminDb.collection('voter_records').doc(cleanEmail).delete();
      try {
        await adminDb.collection('voters').doc(cleanEmail).delete();
      } catch {}
      return NextResponse.json({
        success: true,
        message: `Voter record for ${cleanEmail} permanently deleted. Student can vote again immediately.`,
      });
    }

    const result = await clearAllVotes();
    return NextResponse.json({
      success: true,
      message: `Cleared ${result.deletedVotes} recorded vote(s) and ${result.deletedVoters} voter record(s). Database is now completely reset for live voting.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in reset-votes API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear votes.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
