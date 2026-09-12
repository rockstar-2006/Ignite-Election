'use client';

import { useState, useEffect, useCallback } from 'react';
import SMVITMLogo from '@/components/SMVITMLogo';
import { 
  RefreshCw, 
  ShieldCheck, 
  Vote, 
  Award, 
  Clock, 
  Maximize2, 
  Minimize2, 
  TrendingUp, 
  Crown 
} from 'lucide-react';
import { TvResultsResponse, AnonymousPostSummary } from '@/lib/tv-types';

const REFRESH_INTERVAL_SECONDS = 10 * 60; // 10 minutes = 600s

export default function LiveTvDisplayPage() {
  const [data, setData] = useState<TvResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(REFRESH_INTERVAL_SECONDS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSyncDisplay, setLastSyncDisplay] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fullscreen state listener & auto-fullscreen on interaction
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleAutoFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    // Try immediately when loaded
    handleAutoFullscreen();

    // Engage fullscreen on any interaction (click, touch, key press)
    window.addEventListener('click', handleAutoFullscreen, { passive: true });
    window.addEventListener('touchstart', handleAutoFullscreen, { passive: true });
    window.addEventListener('keydown', handleAutoFullscreen, { passive: true });
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('click', handleAutoFullscreen);
      window.removeEventListener('touchstart', handleAutoFullscreen);
      window.removeEventListener('keydown', handleAutoFullscreen);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Fetch Live TV Results
  const fetchTvResults = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/tv-results?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!res.ok) throw new Error('Unable to connect to live election feed.');
      const json: TvResultsResponse = await res.json();
      setData(json);
      setLastSyncDisplay(`${json.lastUpdatedTime} IST`);
      setSecondsRemaining(REFRESH_INTERVAL_SECONDS);
      setError(null);
    } catch (err: any) {
      console.error('TV results sync error:', err);
      setError('Live connection interrupted. Re-syncing automatically...');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTvResults(false);
  }, [fetchTvResults]);

  // 1-Second Tick Countdown for 10-Minute Polling Cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchTvResults(false);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchTvResults]);

  // Format MM:SS for countdown display
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage of the 10-minute cycle (for the countdown bar)
  const timerProgress = Math.round(((REFRESH_INTERVAL_SECONDS - secondsRemaining) / REFRESH_INTERVAL_SECONDS) * 100);

  // Filter posts: Only show posts where candidates are actively competing
  const contestedPosts = data?.posts?.filter((p) => p.candidateCount > 0) || [];

  // Match hierarchical leadership positions
  const presidentPost = contestedPosts.find(
    (p) => p.postId === 'president' || (p.postName.toLowerCase().includes('president') && !p.postName.toLowerCase().includes('vice'))
  );

  const vicePresidentPost = contestedPosts.find(
    (p) => p.postId === 'vice_president' || p.postName.toLowerCase().includes('vice')
  );

  const secretaryPost = contestedPosts.find(
    (p) => p.postId === 'general_secretary' || p.postId === 'joint_secretary' || p.postName.toLowerCase().includes('secretary')
  );

  // Other contested posts (e.g. Cultural, Technical, Sports, Promotional coordinators)
  const otherContestedPosts = contestedPosts.filter(
    (p) => p !== presidentPost && p !== vicePresidentPost && p !== secretaryPost
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#122147] font-sans selection:bg-[#C59048]/25 selection:text-[#7B1436] flex flex-col justify-between">
      
      {/* Ambient Institutional Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C59048]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-[#7B1436]/05 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] bg-[#122147]/05 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col flex-grow">
        {/* ============================================================ */}
        {/* 1. TOP BROADCAST CONTROL & INSTITUTIONAL HEADER              */}
        {/* ============================================================ */}
        <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#EAE3D9] sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Left: College Brand & Emblem */}
            <div className="flex items-center gap-3.5">
              <SMVITMLogo size="sm" showText={false} className="shadow-xs shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-outfit font-black text-base sm:text-lg text-[#7B1436] tracking-wider uppercase">
                    SMVITM ELECTION BROADCAST
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live TV Feed
                  </span>
                </div>
                <span className="text-xs text-[#122147]/70 font-medium truncate max-w-sm sm:max-w-md">
                  Shri Madhwa Vadiraja Institute of Technology &amp; Management • Bantakal, Udupi
                </span>
              </div>
            </div>

            {/* Right: 10-Minute Countdown, Last Sync, & Fullscreen Button */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              
              {/* 10-Minute Sync Indicator */}
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#FAF3E8] border border-[#E8D3B5] shadow-2xs">
                <Clock className="w-4 h-4 text-[#A37332]" />
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider text-[#A37332] font-bold">
                    Next Sync
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-black text-[#7B1436] tracking-tight">
                    {formatCountdown(secondsRemaining)}
                  </div>
                </div>
              </div>

              {/* Manual Sync Button */}
              <button
                onClick={() => fetchTvResults(true)}
                disabled={refreshing}
                title="Force Immediate Sync"
                className="p-2.5 rounded-2xl bg-white hover:bg-[#FAF3E8] border border-[#EAE3D9] text-[#122147] transition-all cursor-pointer active:scale-95 shadow-xs hover:border-[#C59048] flex items-center justify-center"
              >
                <RefreshCw className={`w-4 h-4 text-[#7B1436] ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Kiosk"}
                className="px-4 py-2 rounded-2xl bg-[#7B1436] hover:bg-[#931841] text-white text-xs font-outfit font-bold transition-all cursor-pointer active:scale-95 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#F5C77E]" />
                    <span className="hidden sm:inline">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-[#F5C77E]" />
                    <span className="hidden sm:inline">TV Fullscreen</span>
                  </>
                )}
              </button>

            </div>

          </div>

          {/* 10-Minute Cycle Progress Line Bar */}
          <div className="w-full bg-[#EAE3D9]/60 h-1 mt-3 overflow-hidden rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-[#7B1436] via-[#C59048] to-emerald-600 transition-all duration-1000 ease-linear"
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </header>

        {/* ============================================================ */}
        {/* LIVE EXECUTIVE LEADERBOARD CARDS ONLY                        */}
        {/* ============================================================ */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 flex-grow space-y-6 sm:space-y-8">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-4">
              <div className="w-12 h-12 border-3 border-[#7B1436]/20 border-t-[#7B1436] rounded-full animate-spin" />
              <p className="text-xs uppercase tracking-widest text-[#122147]/60 font-bold">
                Connecting to SMVITM Live Election Server...
              </p>
            </div>
          ) : error ? (
            <div className="bg-[#FDF2F4] border border-[#F0C4CE] rounded-3xl p-6 text-center text-[#7B1436] text-sm font-semibold">
              {error}
            </div>
          ) : contestedPosts.length === 0 ? (
            <div className="bg-white border border-[#EAE3D9] rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
              <Vote className="w-12 h-12 text-[#C59048] mx-auto mb-3" />
              <h3 className="font-outfit font-bold text-lg text-[#122147]">
                No Contested Posts Currently Competing
              </h3>
              <p className="text-xs text-[#122147]/70 mt-1">
                Only council positions with registered candidates are broadcasted on this live TV screen.
              </p>
            </div>
          ) : (
            <>
              {/* -------------------------------------------------------- */}
              {/* TIER 1: PRESIDENT (TOP HERO CARD)                        */}
              {/* -------------------------------------------------------- */}
              {presidentPost && (
                <div className="bg-gradient-to-br from-white via-[#FFFDF9] to-[#FAF3E8]/60 border-2 border-[#C59048]/40 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-lg transition-all relative overflow-hidden">
                  
                  {/* Decorative ambient corner glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#C59048]/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#7B1436]/05 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EAE3D9]">
                    
                    {/* Post Title & Badge */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF3E8] border border-[#E8D3B5] flex items-center justify-center text-[#A37332] shrink-0 shadow-xs">
                        <Crown className="w-6 h-6 text-[#A37332]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#A37332] font-black">
                            Council Leadership • Tier 1
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF3E8] text-[#A37332] border border-[#E8D3B5] text-[10px] font-bold">
                            1 Winner
                          </span>
                        </div>
                        <h2 className="font-outfit font-black text-2xl sm:text-3xl text-[#122147] tracking-tight">
                          {presidentPost.postName}
                        </h2>
                      </div>
                    </div>

                    {/* Ballots recorded for President */}
                    <div className="flex items-center gap-3 self-start md:self-auto bg-white/90 px-4 py-2.5 rounded-2xl border border-[#EAE3D9] shadow-2xs">
                      <span className="text-xs text-[#122147]/70 font-medium">Ballots Recorded:</span>
                      <span className="font-mono font-bold text-base text-[#7B1436]">
                        {presidentPost.totalVotes}
                      </span>
                    </div>

                  </div>

                    {/* President Contenders Section */}
                  <div className="relative z-10 mt-6">
                    {presidentPost.totalVotes > 0 && presidentPost.leaders.length > 0 ? (
                      presidentPost.leaders.map((leader, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white/90 border border-[#EAE3D9] rounded-2xl p-5 sm:p-6 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#FDF2F4] border border-[#F0C4CE] flex items-center justify-center text-[#7B1436] shrink-0">
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-outfit font-bold text-sm sm:text-base text-[#122147]">
                                  {leader.label}
                                </span>
                                <div className="text-[11px] text-[#122147]/60">
                                  Currently leading executive ballot share
                                </div>
                              </div>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="font-outfit font-black text-3xl sm:text-4xl text-[#7B1436] tracking-tight">
                                {leader.votes}
                              </span>
                              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#122147]/60">
                                {leader.votes === 1 ? 'Vote' : 'Votes'}
                              </span>
                            </div>

                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="w-full bg-[#EAE3D9]/60 h-3.5 rounded-full overflow-hidden p-0.5">
                              <div 
                                className="h-full bg-gradient-to-r from-[#7B1436] via-[#A37332] to-[#C59048] rounded-full transition-all duration-1000 ease-out shadow-xs"
                                style={{ width: `${Math.min(100, Math.max((leader.votes / Math.max(presidentPost.totalVotes, 1)) * 100, 8))}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[#122147]/60 font-medium pt-1">
                              <span className="flex items-center gap-1.5 text-[#122147]/80">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Frontrunner with highest recorded ballots</span>
                              </span>
                              <span className="flex items-center gap-1 font-mono text-[#7B1436]">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Identity Sealed • Zero Bias Protocol</span>
                              </span>
                            </div>
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center bg-white/70 border border-dashed border-[#EAE3D9] rounded-2xl px-4">
                        <Vote className="w-8 h-8 text-[#A37332] mx-auto mb-2" />
                        <p className="font-outfit font-bold text-sm text-[#122147]">
                          Presidential Ballots Awaiting First Count
                        </p>
                        <p className="text-xs text-[#122147]/60 mt-0.5">
                          Leading contender share will appear here live once votes are cast.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* TIER 2: SPLIT ROW (LEFT: VICE-PRESIDENT, RIGHT: SECRETARY) */}
              {/* -------------------------------------------------------- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Card: Vice-President */}
                {vicePresidentPost ? (
                  <div className="bg-white border border-[#EAE3D9] hover:border-[#C59048] rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-[#EAE3D9]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A37332] font-bold">
                              Executive Council • Left Wing
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FAF3E8] text-[#A37332] text-[10px] font-bold border border-[#E8D3B5]">
                              1 Seat
                            </span>
                          </div>
                          <h3 className="font-outfit font-black text-xl sm:text-2xl text-[#122147] tracking-tight mt-1">
                            {vicePresidentPost.postName}
                          </h3>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase text-[#122147]/60 font-bold block">
                            Ballots Cast
                          </span>
                          <span className="font-mono font-bold text-sm text-[#7B1436]">
                            {vicePresidentPost.totalVotes}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Leading Contender */}
                      <div className="space-y-4">
                        {vicePresidentPost.totalVotes > 0 && vicePresidentPost.leaders.length > 0 ? (
                          vicePresidentPost.leaders.map((leader, idx) => (
                            <div 
                              key={idx}
                              className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl p-4.5"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#FAF3E8] border border-[#E8D3B5] flex items-center justify-center text-[#A37332] shrink-0">
                                    <Award className="w-4 h-4" />
                                  </div>
                                  <span className="font-outfit font-bold text-sm text-[#122147]">
                                    {leader.label}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-outfit font-black text-2xl text-[#7B1436]">
                                    {leader.votes}
                                  </span>
                                  <span className="text-xs font-bold uppercase tracking-wider text-[#122147]/60">
                                    {leader.votes === 1 ? 'Vote' : 'Votes'}
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-2">
                                <div className="w-full bg-[#EAE3D9] h-2.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#7B1436] to-[#C59048] rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(100, Math.max((leader.votes / Math.max(vicePresidentPost.totalVotes, 1)) * 100, 8))}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-mono text-[#122147]/70 pt-1">
                                  <span className="flex items-center gap-1 text-emerald-800 font-bold">
                                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                                    Highest Recorded
                                  </span>
                                  <span className="text-[#122147]/50">Identity Sealed 🛡️</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-7 text-center bg-[#FAF7F2] border border-dashed border-[#EAE3D9] rounded-2xl px-4">
                            <Vote className="w-7 h-7 text-[#A37332] mx-auto mb-1.5" />
                            <p className="font-outfit font-bold text-xs text-[#122147]">
                              Ballots Awaiting First Count
                            </p>
                            <p className="text-[11px] text-[#122147]/60 mt-0.5">
                              Leading contender will display as votes are recorded.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#EAE3D9] flex items-center justify-between text-[11px] text-[#122147]/60 font-medium">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C59048]" />
                        <span>Anonymous Kiosk</span>
                      </span>
                      <span>10m TV Sync</span>
                    </div>
                  </div>
                ) : null}

                {/* Right Card: General Secretary / Joint Secretary */}
                {secretaryPost ? (
                  <div className="bg-white border border-[#EAE3D9] hover:border-[#C59048] rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-[#EAE3D9]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A37332] font-bold">
                              Executive Council • Right Wing
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FAF3E8] text-[#A37332] text-[10px] font-bold border border-[#E8D3B5]">
                              {secretaryPost.seats === 2 ? '2 Seats' : '1 Seat'}
                            </span>
                          </div>
                          <h3 className="font-outfit font-black text-xl sm:text-2xl text-[#122147] tracking-tight mt-1">
                            {secretaryPost.postName}
                          </h3>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase text-[#122147]/60 font-bold block">
                            Ballots Cast
                          </span>
                          <span className="font-mono font-bold text-sm text-[#7B1436]">
                            {secretaryPost.totalVotes}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Leading Contender(s) */}
                      <div className="space-y-4">
                        {secretaryPost.totalVotes > 0 && secretaryPost.leaders.length > 0 ? (
                          secretaryPost.leaders.map((leader, idx) => (
                            <div 
                              key={idx}
                              className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl p-4.5"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#FAF3E8] border border-[#E8D3B5] flex items-center justify-center text-[#A37332] shrink-0">
                                    <Award className="w-4 h-4" />
                                  </div>
                                  <span className="font-outfit font-bold text-sm text-[#122147]">
                                    {leader.label}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-outfit font-black text-2xl text-[#7B1436]">
                                    {leader.votes}
                                  </span>
                                  <span className="text-xs font-bold uppercase tracking-wider text-[#122147]/60">
                                    {leader.votes === 1 ? 'Vote' : 'Votes'}
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-2">
                                <div className="w-full bg-[#EAE3D9] h-2.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#7B1436] to-[#C59048] rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(100, Math.max((leader.votes / Math.max(secretaryPost.totalVotes, 1)) * 100, 8))}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-mono text-[#122147]/70 pt-1">
                                  <span className="flex items-center gap-1 text-emerald-800 font-bold">
                                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                                    Highest Recorded
                                  </span>
                                  <span className="text-[#122147]/50">Identity Sealed 🛡️</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-7 text-center bg-[#FAF7F2] border border-dashed border-[#EAE3D9] rounded-2xl px-4">
                            <Vote className="w-7 h-7 text-[#A37332] mx-auto mb-1.5" />
                            <p className="font-outfit font-bold text-xs text-[#122147]">
                              Ballots Awaiting First Count
                            </p>
                            <p className="text-[11px] text-[#122147]/60 mt-0.5">
                              Leading contender will display as votes are recorded.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#EAE3D9] flex items-center justify-between text-[11px] text-[#122147]/60 font-medium">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C59048]" />
                        <span>Anonymous Kiosk</span>
                      </span>
                      <span>10m TV Sync</span>
                    </div>
                  </div>
                ) : null}

              </div>

              {/* -------------------------------------------------------- */}
              {/* TIER 3: OTHER CONTESTED COORDINATOR POSTS (GRID)         */}
              {/* -------------------------------------------------------- */}
              {otherContestedPosts.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-3">
                    <h3 className="font-outfit font-bold text-base sm:text-lg text-[#122147] flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#7B1436]" />
                      <span>Contested Council Coordinators</span>
                    </h3>
                    <span className="text-xs text-[#122147]/60 font-medium">
                      {otherContestedPosts.length} Active Positions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {otherContestedPosts.map((post) => (
                      <div 
                        key={post.postId}
                        className="bg-white border border-[#EAE3D9] hover:border-[#C59048] rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Post Header */}
                          <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-[#EAE3D9]">
                            <div>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-[#A37332] font-bold block">
                                {post.seats === 2 ? '2 Seats' : '1 Seat'}
                              </span>
                              <h4 className="font-outfit font-bold text-base text-[#122147] tracking-tight">
                                {post.postName}
                              </h4>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#7B1436] bg-[#FDF2F4] px-2 py-0.5 rounded-full border border-[#F0C4CE]">
                              {post.totalVotes} Votes
                            </span>
                          </div>

                          {/* Contender Leader(s) */}
                          <div className="space-y-3 my-2">
                            {post.totalVotes > 0 && post.leaders.length > 0 ? (
                              post.leaders.map((leader, idx) => (
                                <div 
                                  key={idx} 
                                  className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl p-3"
                                >
                                  <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="font-outfit font-bold text-[#122147] text-[11px]">
                                      {leader.label}
                                    </span>
                                    <span className="font-outfit font-black text-sm text-[#7B1436]">
                                      {leader.votes} {leader.votes === 1 ? 'Vote' : 'Votes'}
                                    </span>
                                  </div>

                                  <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-[#7B1436] to-[#C59048] rounded-full transition-all duration-700"
                                      style={{ width: `${Math.min(100, Math.max((leader.votes / Math.max(post.totalVotes, 1)) * 100, 8))}%` }}
                                    />
                                  </div>

                                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#122147]/60 font-mono">
                                    <span>Frontrunner</span>
                                    <span>Identity Sealed 🛡️</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-5 text-center bg-[#FAF7F2] border border-dashed border-[#EAE3D9] rounded-xl px-2">
                                <p className="text-[11px] text-[#122147]/70 font-medium">
                                  Awaiting First Ballots
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#EAE3D9] flex items-center justify-between text-[10px] text-[#122147]/50 font-medium">
                          <span>Zero Names Disclosed</span>
                          <span>10m TV Sync</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </main>

        {/* ============================================================ */}
        {/* 4. FOOTER TICKER & VERIFICATION STAMP                        */}
        {/* ============================================================ */}
        <footer className="w-full bg-white border-t border-[#EAE3D9] py-4 px-4 sm:px-8 text-xs text-[#122147]/60">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[#122147]">Last Synced:</span>
              <span className="font-mono text-[#7B1436] font-semibold">{lastSyncDisplay || 'Pending First Cycle'}</span>
              <span className="hidden md:inline text-[#EAE3D9]">•</span>
              <span className="hidden md:inline">Auto-polls every 10 minutes</span>
            </div>

            <div className="text-center sm:text-right text-[11px] text-[#122147]/70 font-medium flex items-center justify-center sm:justify-end gap-2">
              <span>Shri Madhwa Vadiraja Institute of Technology &amp; Management</span>
              <span className="text-[#EAE3D9]">•</span>
              <span className="font-semibold text-[#7B1436]">Powered by Edmin</span>
            </div>

          </div>
        </footer>
      </div>

    </div>
  );
}
