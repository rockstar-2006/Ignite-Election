import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminLogin } from '@/lib/server/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const verification = await verifyAdminLogin(email, password, sessionId);

    if (!verification.isValid) {
      return NextResponse.json(
        { 
          error: verification.error || 'Authentication failed.',
          inUse: verification.inUse || false,
          remainingSeconds: verification.remainingSeconds,
        },
        { status: verification.inUse ? 409 : 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      email: email.toLowerCase().trim(),
      sessionId,
      message: 'Admin authenticated successfully.',
    });

    response.cookies.set({
      name: 'smvitm_admin_session',
      value: Buffer.from(JSON.stringify({ email, sessionId, timestamp: Date.now() })).toString('base64'),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Admin login API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
