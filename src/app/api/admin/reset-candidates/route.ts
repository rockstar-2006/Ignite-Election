import { NextRequest, NextResponse } from 'next/server';
import { clearAllCandidates } from '@/lib/server/voting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const result = await clearAllCandidates();
    return NextResponse.json({
      success: true,
      message: `Successfully cleared all candidate records (${result.deletedCandidates}) from the database.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error resetting candidates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset candidates.' },
      { status: 500 }
    );
  }
}
