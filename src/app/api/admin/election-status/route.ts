import { NextRequest, NextResponse } from 'next/server';
import { getElectionStatus, setElectionStatus } from '@/lib/server/voting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const status = await getElectionStatus();
    return NextResponse.json(
      { success: true, status },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching election status:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch election status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isPublished, votingOpen } = body;

    const updated = await setElectionStatus(
      typeof isPublished === 'boolean' ? isPublished : true,
      typeof votingOpen === 'boolean' ? votingOpen : true
    );

    return NextResponse.json({
      success: true,
      status: updated,
      message: updated.isPublished 
        ? 'Ballot successfully published and voting window opened.' 
        : 'Ballot unpublished and voting closed.',
    });
  } catch (error: any) {
    console.error('Error updating election status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update election status' }, { status: 500 });
  }
}
