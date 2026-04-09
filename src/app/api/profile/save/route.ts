import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get session to verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Verify user can only create/update their own profile
    if (data.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Cannot modify another user\'s profile' },
        { status: 403 }
      );
    }

    // Create or update profile using Firebase Admin SDK
    const docRef = adminDb.collection('users').doc(data.email);
    
    await docRef.set({
      ...data,
      createdAt: new Date(),
      nominations: data.nominations || [],
    }, { merge: true });

    return NextResponse.json({ 
      success: true,
      message: 'Profile saved successfully'
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}
