import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { submitBallot } from '@/lib/server/voting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const email = (session?.user?.email || body.email || '').toLowerCase().trim();
    const semester = body.semester || 'College-Wide';
    const selections = body.selections;

    if (!email) {
      return NextResponse.json(
        { error: 'Unauthorized: Voter email is required to cast a ballot.' },
        { status: 401 }
      );
    }

    if (!selections || typeof selections !== 'object' || Object.keys(selections).length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one candidate before submitting your ballot.' },
        { status: 400 }
      );
    }

    const result = await submitBallot(email, semester, selections);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error submitting vote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit vote.' },
      { status: 400 }
    );
  }
}
