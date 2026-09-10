import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasUserVoted } from '@/lib/server/voting';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json(
        { hasVoted: false, authenticated: false },
        { status: 200 }
      );
    }

    const status = await hasUserVoted(email);

    return NextResponse.json({
      hasVoted: status.hasVoted,
      votedAt: status.votedAt,
      email,
      authenticated: true,
    });
  } catch (error: any) {
    console.error('Error checking voting status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check voting status' },
      { status: 500 }
    );
  }
}
