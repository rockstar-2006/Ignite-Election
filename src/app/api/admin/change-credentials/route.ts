import { NextRequest, NextResponse } from 'next/server';
import { updateAdminCredentials } from '@/lib/server/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { currentEmail, currentPassword, newEmail, newPassword } = await request.json();

    if (!currentEmail || !currentPassword) {
      return NextResponse.json(
        { error: 'Current email and current password are required.' },
        { status: 400 }
      );
    }

    const result = await updateAdminCredentials(currentEmail, currentPassword, newEmail, newPassword);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Admin credential update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update admin credentials.' },
      { status: 400 }
    );
  }
}
