import { NextRequest, NextResponse } from 'next/server';
import { touchAdminSession, getActiveAdminSession, releaseAdminSession } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, forceRelease } = body;

    if (forceRelease) {
      await releaseAdminSession(undefined, true);
      return NextResponse.json({ success: true, released: true });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const ok = await touchAdminSession(sessionId);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getActiveAdminSession();
    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
