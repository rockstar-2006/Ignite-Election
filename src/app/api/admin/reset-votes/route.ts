import { NextRequest, NextResponse } from 'next/server';
import { clearAllVotes, hashVoterIdentifier } from '@/lib/server/voting';
import { getActiveAdminSession, touchAdminSession } from '@/lib/server/admin-auth';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const { searchParams } = new URL(request.url);
    const sessionId = body?.sessionId || searchParams.get('sessionId');

    // Verify admin authorization
    let isAuthorized = false;
    const activeSession = await getActiveAdminSession();
    if (activeSession.isActive) {
      isAuthorized = true;
    } else if (sessionId) {
      isAuthorized = await touchAdminSession(sessionId);
    }

    if (!isAuthorized) {
      const sessionCookie = request.cookies.get('smvitm_admin_session')?.value;
      if (sessionCookie) {
        try {
          const parsed = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf8'));
          if (parsed?.sessionId) {
            isAuthorized = await touchAdminSession(parsed.sessionId);
          }
        } catch {}
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid Election Commission admin session required.' },
        { status: 401 }
      );
    }

    // Keep session alive
    if (sessionId) {
      await touchAdminSession(sessionId);
    }

    let email = body?.email || searchParams.get('email') || undefined;

    // If specific email provided, reset that single voter's status
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const voterHash = hashVoterIdentifier(cleanEmail);

      await adminDb.collection('voter_records').doc(cleanEmail).delete();
      try {
        await adminDb.collection('voter_records').doc(voterHash).delete();
      } catch {}
      try {
        await adminDb.collection('voters').doc(cleanEmail).delete();
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Voter record for ${cleanEmail} permanently deleted. Student can vote again immediately.`,
      });
    }

    // Otherwise clear all votes and running tallies
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
