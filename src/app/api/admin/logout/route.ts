import { NextRequest, NextResponse } from 'next/server';
import { releaseAdminSession } from '@/lib/server/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, force } = body;

    await releaseAdminSession(sessionId, force || false);

    const response = NextResponse.json({
      success: true,
      message: 'Admin session released successfully.',
    });

    response.cookies.delete('smvitm_admin_session');

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
