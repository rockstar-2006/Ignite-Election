import { NextRequest, NextResponse } from 'next/server';
import { getCandidates } from '@/lib/server/voting';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester') || undefined;

    const candidates = await getCandidates(semester);

    return NextResponse.json({
      success: true,
      message: 'Candidates loaded from database successfully.',
      candidatesCount: candidates.length,
      candidates,
    });
  } catch (error: any) {
    console.error('Error in candidate route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load candidate data.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

