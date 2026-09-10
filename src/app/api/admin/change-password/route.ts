import { NextRequest, NextResponse } from 'next/server';
import { updateAdminPassword } from '@/lib/server/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await request.json();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Email, current password, and new password are all required.' },
        { status: 400 }
      );
    }

    const result = await updateAdminPassword(email, currentPassword, newPassword);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Admin password change error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update admin password.' },
      { status: 400 }
    );
  }
}
