import { NextResponse } from 'next/server';
import { getElectionStatus } from '@/lib/server/voting';

export async function GET() {
  try {
    const status = await getElectionStatus();
    return NextResponse.json(
      { success: true, status },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching public election status:', error);
    return NextResponse.json({ 
      success: true, 
      status: { isPublished: false, votingOpen: false } 
    });
  }
}
