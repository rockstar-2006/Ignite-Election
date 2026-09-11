import { NextRequest, NextResponse } from 'next/server';
import { getCandidates } from '@/lib/server/voting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester') || undefined;

    const candidates = await getCandidates(semester);

    return NextResponse.json(
      { 
        success: true, 
        candidates 
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
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch candidates', candidates: [] },
      { status: 500 }
    );
  }
}
