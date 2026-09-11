import { NextRequest, NextResponse } from 'next/server';
import { clearAllVotes } from '@/lib/server/voting';
import { getActiveAdminSession } from '@/lib/server/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const activeSession = await getActiveAdminSession();
    if (!activeSession.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid Election Commission admin session required.' },
        { status: 401 }
      );
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
