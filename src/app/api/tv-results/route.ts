import { NextRequest, NextResponse } from 'next/server';
import { getVotingResults } from '@/lib/server/voting';
import { OFFICIAL_COUNCIL_POSTS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { AnonymousLeader, AnonymousPostSummary, TvResultsResponse } from '@/lib/tv-types';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch live aggregate results from Firestore
    const results = await getVotingResults();

    const now = new Date();
    const lastUpdatedDate = now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const lastUpdatedTime = now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    // 2. Filter ONLY posts where candidates are actively competing (exclude posts with no candidates)
    const contestedPosts = results.postResults.filter(
      (post) => post.candidates && post.candidates.length > 0
    );

    // Build strictly anonymized post leaderboard (ZERO names, ZERO photos, ZERO USNs, ZERO low candidates)
    const sanitizedPosts: AnonymousPostSummary[] = contestedPosts.map((post) => {
      const seats = post.seats || 1;
      const isDualGender = seats === 2 && post.genderRule === '1_boy_1_girl';
      const totalPostVotes = post.totalVotes || 0;
      const candidateCount = post.candidates.length;

      const leaders: AnonymousLeader[] = [];

      if (isDualGender) {
        // Dual Seat (1 Boy + 1 Girl Winner rule)
        const maleCands = post.candidates.filter((c) => c.gender === 'Male').sort((a, b) => b.votes - a.votes);
        const femaleCands = post.candidates.filter((c) => c.gender === 'Female').sort((a, b) => b.votes - a.votes);

        const topMale = maleCands[0];
        const secondMale = maleCands[1];
        const topFemale = femaleCands[0];
        const secondFemale = femaleCands[1];

        if (topMale && topMale.votes > 0) {
          const pct = totalPostVotes > 0 ? Math.round((topMale.votes / totalPostVotes) * 100) : 0;
          const margin = secondMale ? topMale.votes - secondMale.votes : topMale.votes;
          leaders.push({
            label: 'Leading Contender',
            votes: topMale.votes,
            percentage: pct,
            hasVotes: true,
            leadMargin: margin,
          });
        }

        if (topFemale && topFemale.votes > 0) {
          const pct = totalPostVotes > 0 ? Math.round((topFemale.votes / totalPostVotes) * 100) : 0;
          const margin = secondFemale ? topFemale.votes - secondFemale.votes : topFemale.votes;
          leaders.push({
            label: 'Leading Contender',
            votes: topFemale.votes,
            percentage: pct,
            hasVotes: true,
            leadMargin: margin,
          });
        }
      } else {
        // Single Seat (or General Multi-Seat): Highest vote getter only
        const sorted = [...post.candidates].sort((a, b) => b.votes - a.votes);
        const topCandidate = sorted[0];
        const runnerUp = sorted[1];

        if (topCandidate && topCandidate.votes > 0) {
          const pct = totalPostVotes > 0 ? Math.round((topCandidate.votes / totalPostVotes) * 100) : 0;
          const margin = runnerUp ? topCandidate.votes - runnerUp.votes : topCandidate.votes;
          leaders.push({
            label: 'Leading Contender',
            votes: topCandidate.votes,
            percentage: pct,
            hasVotes: true,
            leadMargin: margin,
          });
        }
      }

      let status: 'active_votes' | 'uncontested' | 'awaiting_ballots' = 'active_votes';
      if (candidateCount === 0) {
        status = 'uncontested';
      } else if (totalPostVotes === 0 || leaders.length === 0) {
        status = 'awaiting_ballots';
      }

      return {
        postId: post.postId,
        postName: post.postName,
        semester: post.semester,
        seats,
        genderRule: '',
        totalVotes: totalPostVotes,
        candidateCount,
        leaders,
        status,
      };
    });

    const responsePayload: TvResultsResponse = {
      success: true,
      totalBallotsCast: results.totalVotes,
      totalUniqueElectors: results.totalVoters,
      totalCouncilPosts: OFFICIAL_COUNCIL_POSTS.length,
      totalContestedPosts: sanitizedPosts.length,
      lastUpdatedTime,
      lastUpdatedDate,
      posts: sanitizedPosts,
    };

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error serving anonymous TV live results:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch TV live results.' },
      { status: 500 }
    );
  }
}
