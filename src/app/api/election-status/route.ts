import { NextResponse } from 'next/server';
import { getElectionStatus } from '@/lib/server/voting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const status = await getElectionStatus();
    return NextResponse.json(
      { success: true, status },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
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
