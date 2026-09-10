import { adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('manifest') === 'true') {
      return NextResponse.json(
        {
          name: 'SMVITM Student Council Elections',
          short_name: 'SMVITM Voting',
          description: 'Official Student Council E-Voting Platform of Shri Madhwa Vadiraja Institute of Technology & Management',
          id: '/auth/signin',
          start_url: '/auth/signin?direct=true',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#FAF7F2',
          theme_color: '#7B1436',
          icons: [
            {
              src: '/api/logo',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/api/logo',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
          }
        }
      );
    }

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
