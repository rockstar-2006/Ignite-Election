import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasUserVoted } from '@/lib/server/voting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    const session = await getServerSession(authOptions);
    const email = (session?.user?.email || emailParam || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { hasVoted: false, authenticated: false },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    const status = await hasUserVoted(email);

    return NextResponse.json(
      {
        hasVoted: status.hasVoted,
        votedAt: status.votedAt,
        email,
        authenticated: true,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error checking voting status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check voting status' },
      { status: 500 }
    );
  }
}
