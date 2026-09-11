import { adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

interface CachedStats {
  stats: Record<string, number>;
  totalUsers: number;
  expiresAt: number;
}

let cachedStats: CachedStats | null = null;
const STATS_CACHE_TTL_MS = 120 * 1000; // 2 minutes

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
          start_url: '/auth/signin',
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
              purpose: 'any maskable',
            },
            {
              src: '/api/logo',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
          },
        }
      );
    }

    const now = Date.now();
    if (cachedStats && cachedStats.expiresAt > now) {
      return NextResponse.json(
        {
          success: true,
          stats: cachedStats.stats,
          totalUsers: cachedStats.totalUsers,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    // Scalable query: Only query users who have nominations, instead of scanning every user in the college
    let totalUsers = 0;
    try {
      const countSnap = await adminDb.collection('users').count().get();
      totalUsers = countSnap.data().count;
    } catch {
      totalUsers = 0;
    }

    const nominatedUsersSnap = await adminDb
      .collection('users')
      .where('nominations', '!=', [])
      .get();

    const stats: Record<string, number> = {};

    nominatedUsersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.nominations && Array.isArray(data.nominations)) {
        data.nominations.forEach((postId: string) => {
          stats[postId] = (stats[postId] || 0) + 1;
        });
      }
    });

    cachedStats = {
      stats,
      totalUsers: totalUsers || nominatedUsersSnap.size,
      expiresAt: now + STATS_CACHE_TTL_MS,
    };

    return NextResponse.json(
      {
        success: true,
        stats,
        totalUsers: cachedStats.totalUsers,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('API Stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
