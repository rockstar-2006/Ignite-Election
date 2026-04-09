import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const q = adminDb.collection("users");
    const snapshot = await q.get();
    
    const stats: Record<string, number> = {};
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.nominations && Array.isArray(data.nominations)) {
        data.nominations.forEach((postId: string) => {
          stats[postId] = (stats[postId] || 0) + 1;
        });
      }
    });

    return NextResponse.json({ 
      success: true, 
      stats,
      totalUsers: snapshot.size
    });
  } catch (error) {
    console.error("API Stats error:", error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
