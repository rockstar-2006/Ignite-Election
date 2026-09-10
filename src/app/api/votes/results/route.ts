import { NextRequest, NextResponse } from 'next/server';
import { getVotingResults } from '@/lib/server/voting';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester') as '6th' | '4th' | null;

    // Retrieve exclusively real voting data from Firestore
    const results = await getVotingResults(semester || undefined);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: any) {
    console.error('Error fetching real vote results:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate election results.' },
      { status: 500 }
    );
  }
}
