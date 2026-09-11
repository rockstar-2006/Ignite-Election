'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Candidate } from '@/lib/server/voting';
import { OFFICIAL_COUNCIL_POSTS, OfficialPost } from '@/lib/constants';
import { 
  CheckCircle2, 
  CheckSquare, 
  AlertCircle, 
  Loader2, 
  Clock, 
  UserCheck, 
  Award, 
  ShieldCheck, 
  Sparkles,
  Lock,
  Vote,
  User,
  Users,
  AlertTriangle,
  LogOut,
  X
} from 'lucide-react';

interface VotingBoothProps {
  semester: string;
  email: string;
  onVoteSuccess?: () => void;
}

export default function VotingBooth({ semester, email, onVoteSuccess }: VotingBoothProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [electionStatus, setElectionStatus] = useState<{ isPublished: boolean; votingOpen: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedAt, setVotedAt] = useState<string | null>(null);
  
  // For 1-seat posts: postId -> candidateId
  // For 2-seat posts: postId -> { boy?: string; girl?: string; anySelected?: string[] }
  const [selectedSingleVotes, setSelectedSingleVotes] = useState<Record<string, string>>({});
  const [selectedDualVotes, setSelectedDualVotes] = useState<Record<string, { boy?: string; girl?: string; anySelected?: string[] }>>({});
  
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutCountdown, setLogoutCountdown] = useState(8);
  const [mounted, setMounted] = useState(false);
  const voterSemesterLabel = 'College-Wide Council';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (confirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setConfirmChecked(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [confirmModal]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasVoted) {
      timer = setInterval(() => {
        setLogoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (onVoteSuccess) onVoteSuccess();
            else window.location.href = '/api/auth/signout';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [hasVoted, onVoteSuccess]);

  useEffect(() => {
    loadVotingData();
  }, [email, semester]);

  const loadVotingData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check voting status of current student
      const statusRes = await fetch('/api/votes/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.hasVoted) {
          setHasVoted(true);
          setVotedAt(statusData.votedAt);
        }
      }

      // 2. Fetch election commission publication & voting open status
      const electionRes = await fetch('/api/election-status');
      if (electionRes.ok) {
        const electData = await electionRes.json();
        setElectionStatus(electData.status || { isPublished: false, votingOpen: false });
      }

      // 3. Load official candidates from database
      const candRes = await fetch('/api/candidates');
      if (candRes.ok) {
        const candData = await candRes.json();
        const allCandidates: Candidate[] = candData.candidates || [];
        setCandidates(allCandidates);
      }
    } catch (err: any) {
      console.error('Error loading voting booth data:', err);
      setError('Failed to load election candidates. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Group candidates according to OFFICIAL_COUNCIL_POSTS
  const postConfigMap = new Map<string, OfficialPost>(
    OFFICIAL_COUNCIL_POSTS.map((p) => [p.id, p])
  );

  const postsMap: Record<string, { postName: string; postConfig: OfficialPost; candidates: Candidate[] }> = {};
  
  // Initialize with official posts that have candidates or show all official posts
  OFFICIAL_COUNCIL_POSTS.forEach((postDef) => {
    const postCands = candidates.filter((c) => c.postId === postDef.id);
    if (postCands.length > 0) {
      postsMap[postDef.id] = {
        postName: postDef.name,
        postConfig: postDef,
        candidates: postCands,
      };
    }
  });

  // Also include any posts not in predefined list if present in candidate data
  candidates.forEach((cand) => {
    if (!postsMap[cand.postId]) {
      postsMap[cand.postId] = {
        postName: cand.postName || cand.postId,
        postConfig: postConfigMap.get(cand.postId) || {
          id: cand.postId,
          name: cand.postName || cand.postId,
          seats: 1,
          genderRule: 'any',
        },
        candidates: [],
      };
      postsMap[cand.postId].candidates.push(cand);
    }
  });

  const totalContestedPosts = Object.keys(postsMap).length;

  // Validate completion status
  const isPostComplete = (postId: string): boolean => {
    const postItem = postsMap[postId];
    if (!postItem) return false;
    const { postConfig, candidates: postCands } = postItem;

    if (postConfig.seats === 1 || postConfig.genderRule !== '1_boy_1_girl') {
      return Boolean(selectedSingleVotes[postId]);
    }

    // For 2-seat posts (1 Boy & 1 Girl)
    const boyCands = postCands.filter((c) => c.gender !== 'Female');
    const girlCands = postCands.filter((c) => c.gender === 'Female');
    const current = selectedDualVotes[postId] || {};

    if (boyCands.length > 0 && girlCands.length > 0) {
      return Boolean(current.boy && current.girl);
    } else if (boyCands.length > 0) {
      const needed = Math.min(2, boyCands.length);
      return (current.anySelected?.length || 0) >= needed;
    } else if (girlCands.length > 0) {
      const needed = Math.min(2, girlCands.length);
      return (current.anySelected?.length || 0) >= needed;
    }

    return false;
  };

  const completedPostsCount = Object.keys(postsMap).filter(isPostComplete).length;
  const isBallotComplete = totalContestedPosts > 0 && completedPostsCount === totalContestedPosts;

  const handleSelectSingle = (postId: string, candidateId: string) => {
    if (hasVoted) return;
    setSelectedSingleVotes((prev) => ({
      ...prev,
      [postId]: candidateId,
    }));
  };

  const handleSelectDualGender = (postId: string, gender: 'Male' | 'Female', candidateId: string) => {
    if (hasVoted) return;
    setSelectedDualVotes((prev) => {
      const current = prev[postId] || {};
      if (gender === 'Male') {
        return { ...prev, [postId]: { ...current, boy: candidateId } };
      } else {
        return { ...prev, [postId]: { ...current, girl: candidateId } };
      }
    });
  };

  const handleSelectDualAny = (postId: string, candidateId: string, maxSeats = 2) => {
    if (hasVoted) return;
    setSelectedDualVotes((prev) => {
      const current = prev[postId]?.anySelected || [];
      let updated: string[];
      if (current.includes(candidateId)) {
        updated = current.filter((id) => id !== candidateId);
      } else {
        if (current.length >= maxSeats) {
          updated = [...current.slice(1), candidateId];
        } else {
          updated = [...current, candidateId];
        }
      }
      return { ...prev, [postId]: { ...prev[postId], anySelected: updated } };
    });
  };

  const handleOpenConfirmModal = () => {
    if (!isBallotComplete) {
      setError(`Please complete selections for all ${totalContestedPosts} positions before reviewing your ballot.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);
    setConfirmModal(true);
  };

  const handleSubmitBallot = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Build flattened selections payload: Record<string, string | string[]>
      const selectionsPayload: Record<string, string | string[]> = {};

      for (const [postId, postItem] of Object.entries(postsMap)) {
        if (postItem.postConfig.seats === 1 || postItem.postConfig.genderRule !== '1_boy_1_girl') {
          selectionsPayload[postId] = selectedSingleVotes[postId];
        } else {
          const dual = selectedDualVotes[postId] || {};
          const selectedList: string[] = [];
          if (dual.boy) selectedList.push(dual.boy);
          if (dual.girl) selectedList.push(dual.girl);
          if (dual.anySelected && dual.anySelected.length > 0) {
            dual.anySelected.forEach((id) => {
              if (!selectedList.includes(id)) selectedList.push(id);
            });
          }
          selectionsPayload[postId] = selectedList;
        }
      }

      const res = await fetch('/api/votes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: semester || 'College-Wide',
          selections: selectionsPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ballot');
      }

      setHasVoted(true);
      setVotedAt(data.votedAt || new Date().toLocaleString('en-IN'));
      setConfirmModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your vote. Please retry.');
      setConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#7B1436]" />
        <p className="text-xs font-bold font-outfit text-[#122147]/70 uppercase tracking-widest">
          Loading Official Council Ballot...
        </p>
      </div>
    );
  }

  // ==========================================
  // STATE 1: ALREADY VOTED (Official Certificate)
  // ==========================================
  if (hasVoted) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in font-outfit">
        <div className="bg-white border-2 border-[#C59048]/30 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-[#122147]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7B1436] via-[#C59048] to-[#122147]" />

          <div className="w-20 h-20 bg-[#FAF3E8] border-2 border-[#C59048] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-[#7B1436]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#A37332] text-xs font-bold uppercase tracking-widest mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Vote Confirmed
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-[#122147] tracking-tight">
            Your Vote Has Been Recorded!
          </h2>

          <p className="text-xs sm:text-sm text-[#122147]/70 max-w-lg mx-auto mt-2 leading-relaxed font-medium">
            Thank you for voting in the <strong>SMVITM Student Council Elections</strong>. Your vote is completely secret and private.
          </p>

          <div className="my-8 p-5 bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl text-left space-y-3">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-[#EAE3D9]">
              <span className="text-[#122147]/60 font-semibold">College</span>
              <span className="font-bold text-[#122147]">SMVITM Bantakal, Udupi</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-[#EAE3D9]">
              <span className="text-[#122147]/60 font-semibold">Ballot</span>
              <span className="font-bold text-[#7B1436]">Student Council General Election</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-[#EAE3D9]">
              <span className="text-[#122147]/60 font-semibold">Time Recorded</span>
              <span className="font-mono font-bold text-[#122147] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C59048]" />
                {votedAt || 'Verified Time'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#122147]/60 font-semibold">Vote Privacy</span>
              <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ✓ Secret Ballot (Private)
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#122147]/60 font-medium">
            Each student can submit their vote only once.
          </div>

          {/* Auto Logout Card for Next Student */}
          <div className="mt-6 pt-6 border-t border-[#EAE3D9] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FAF7F2] p-4 rounded-2xl">
            <div className="text-left text-xs">
              <p className="font-bold text-[#122147]">Logging out automatically for next voter...</p>
              <p className="text-stone-500 text-[11px] mt-0.5">Session will close in <strong>{logoutCountdown}s</strong> so the next student can vote.</p>
            </div>
            <button
              onClick={() => {
                if (onVoteSuccess) onVoteSuccess();
                else window.location.href = '/api/auth/signout';
              }}
              className="px-5 py-2 rounded-full bg-[#7B1436] hover:bg-[#5e0e28] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout Now</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STATE 2: ELECTION CLOSED OR UNPUBLISHED
  // ==========================================
  if (electionStatus && (!electionStatus.isPublished || !electionStatus.votingOpen)) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in font-outfit">
        <div className="bg-white border-2 border-[#C59048]/30 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-[#122147]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7B1436] via-[#C59048] to-[#122147]" />

          <div className="w-20 h-20 bg-[#FAF3E8] border-2 border-[#C59048] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Lock className="w-10 h-10 text-[#7B1436]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#A37332] text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C59048]" />
            Student Council Elections
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-[#122147] tracking-tight">
            Voting Is Currently Closed
          </h2>

          <p className="text-xs sm:text-sm text-[#122147]/70 max-w-lg mx-auto mt-3 leading-relaxed font-medium">
            The voting link has not been activated yet by the college administrator. Please check back when voting is opened.
          </p>

          <div className="mt-8 pt-6 border-t border-[#EAE3D9] flex items-center justify-center gap-2 text-xs font-semibold text-[#122147]/60">
            <ShieldCheck className="w-4 h-4 text-[#C59048]" />
            <span>SMVITM Student Voting Portal</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STATE 3: EMPTY BALLOT (NO CANDIDATES REGISTERED)
  // ==========================================
  if (candidates.length === 0 || totalContestedPosts === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in font-outfit">
        <div className="bg-white border-2 border-[#C59048]/30 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-[#122147]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7B1436] via-[#C59048] to-[#122147]" />

          <div className="w-20 h-20 bg-[#FAF3E8] border-2 border-[#C59048] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Vote className="w-10 h-10 text-[#7B1436]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#A37332] text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C59048]" />
            Student Council Elections
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-[#122147] tracking-tight">
            No Candidates Added Yet
          </h2>

          <p className="text-xs sm:text-sm text-[#122147]/70 max-w-lg mx-auto mt-3 leading-relaxed font-medium">
            Candidates have not been registered in the portal yet. Voting will open once the candidate list is updated.
          </p>

          <div className="mt-8 pt-6 border-t border-[#EAE3D9] flex items-center justify-center gap-2 text-xs font-semibold text-[#122147]/60">
            <ShieldCheck className="w-4 h-4 text-[#C59048]" />
            <span>SMVITM Student Voting Portal</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STATE 4: ACTIVE OFFICIAL VOTING BOOTH
  // ==========================================
  return (
    <div className="space-y-8 relative font-outfit">
      {/* Modern Ballot Header Card */}
      <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF3E8] text-[#A37332] border border-[#E8D3B5]">
              Student Council General Election
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-[#7B1436] font-semibold">
              {totalContestedPosts} Positions to Vote
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#122147] tracking-tight">
            Student Council Elections
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-normal max-w-xl">
            Please choose your candidates for each position below. For positions with 2 seats, select 1 Boy and 1 Girl candidate. Your vote is secret.
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#EAE3D9] flex items-center justify-center text-[#C59048] shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
              Ballot Progress
            </span>
            <span className="text-sm font-bold text-[#122147]">
              {completedPostsCount} of {totalContestedPosts} Completed
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-[#7B1436] text-xs sm:text-sm font-medium flex items-center gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#7B1436]" />
          <span>{error}</span>
        </div>
      )}

      {/* Position-by-Position Candidate Listings */}
      <div className="space-y-10 pb-32">
        {Object.entries(postsMap).map(([postId, postData], index) => {
          const { postConfig, candidates: postCands } = postData;
          const isComplete = isPostComplete(postId);
          const isDualGender = postConfig.seats === 2 && postConfig.genderRule === '1_boy_1_girl';

          const boyCandidates = postCands.filter((c) => c.gender !== 'Female');
          const girlCandidates = postCands.filter((c) => c.gender === 'Female');
          const hasBothGenders = boyCandidates.length > 0 && girlCandidates.length > 0;

          const singleSelectedId = selectedSingleVotes[postId];
          const dualSelections = selectedDualVotes[postId] || {};

          return (
            <div
              key={postId}
              className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md"
            >
              {/* Position Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-[#EAE3D9]/80 gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF3E8] text-[#7B1436] border border-[#E8D3B5] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-[#122147] tracking-tight">
                        {postData.postName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                        {postConfig.seats === 1 ? '1 Seat (Open Contest — 1 Winner)' : '2 Seats (1 Boy & 1 Girl)'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">
                      {postConfig.description || `${postData.postName} of the SMVITM Student Council`}
                    </p>
                  </div>
                </div>

                <div>
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/90 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Selection Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#FAF3E8] text-[#A37332] border border-[#E8D3B5] rounded-full text-xs font-semibold">
                      Action Required
                    </span>
                  )}
                </div>
              </div>

              {/* RENDER CANDIDATES: EITHER DUAL GENDER COLUMNS OR STANDARD GRID */}
              {isDualGender && hasBothGenders ? (
                <div className="space-y-6">
                  {/* Boy Candidates Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                        Boy Nominees (Select 1 Winner)
                      </h4>
                      {dualSelections.boy && (
                        <span className="text-xs font-semibold text-emerald-700">✓ 1 Boy Selected</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {boyCandidates.map((cand) => {
                        const isSelected = dualSelections.boy === cand.id;
                        return (
                          <CandidateCard
                            key={cand.id}
                            cand={cand}
                            isSelected={isSelected}
                            onSelect={() => handleSelectDualGender(postId, 'Male', cand.id)}
                            isDualGenderPost={true}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Girl Candidates Section */}
                  <div className="pt-4 border-t border-dashed border-[#EAE3D9]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                        Girl Nominees (Select 1 Winner)
                      </h4>
                      {dualSelections.girl && (
                        <span className="text-xs font-semibold text-emerald-700">✓ 1 Girl Selected</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {girlCandidates.map((cand) => {
                        const isSelected = dualSelections.girl === cand.id;
                        return (
                          <CandidateCard
                            key={cand.id}
                            cand={cand}
                            isSelected={isSelected}
                            onSelect={() => handleSelectDualGender(postId, 'Female', cand.id)}
                            isDualGenderPost={true}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : isDualGender ? (
                // Dual seat post but all candidates are of same gender
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-stone-500">
                      Select up to {Math.min(2, postCands.length)} candidates for this post:
                    </p>
                    <span className="text-xs font-bold text-[#7B1436]">
                      {dualSelections.anySelected?.length || 0} of {Math.min(2, postCands.length)} Selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {postCands.map((cand) => {
                      const isSelected = Boolean(dualSelections.anySelected?.includes(cand.id));
                      return (
                        <CandidateCard
                          key={cand.id}
                          cand={cand}
                          isSelected={isSelected}
                          onSelect={() => handleSelectDualAny(postId, cand.id, Math.min(2, postCands.length))}
                          isDualGenderPost={true}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Single Winner Post (President, Vice-President, General Secretary, etc.)
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-500 font-medium">
                      Select 1 candidate (Open contest — all nominees compete together):
                    </p>
                    {singleSelectedId && (
                      <span className="text-xs font-semibold text-emerald-700">✓ 1 Candidate Selected</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {postCands.map((cand) => {
                      const isSelected = singleSelectedId === cand.id;
                      return (
                        <CandidateCard
                          key={cand.id}
                          cand={cand}
                          isSelected={isSelected}
                          onSelect={() => handleSelectSingle(postId, cand.id)}
                          isDualGenderPost={false}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Sticky Bottom Submission Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE3D9] shadow-xl px-4 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF3E8] text-[#7B1436] flex items-center justify-center shrink-0 border border-[#E8D3B5] shadow-2xs">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#122147]">
                Voting Progress: {completedPostsCount} of {totalContestedPosts} Positions Selected
              </p>
              <p className="text-xs text-stone-500 font-normal">
                {isBallotComplete 
                  ? 'All positions selected! You are ready to review and submit your vote.'
                  : `Please select candidates for the remaining ${totalContestedPosts - completedPostsCount} position(s).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleOpenConfirmModal}
              disabled={!isBallotComplete || submitting}
              className={`w-full sm:w-auto px-7 py-3 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md ${
                isBallotComplete && !submitting
                  ? 'bg-[#7B1436] hover:bg-[#5e0e28] text-white cursor-pointer active:scale-95 shadow-[#7B1436]/20'
                  : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Review &amp; Submit Vote</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Ballot Confirmation Modal */}
      {mounted && confirmModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-outfit overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setConfirmModal(false);
          }}
        >
          <div className="bg-white border-2 border-[#C59048]/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-auto max-h-[90vh] flex flex-col justify-between overflow-hidden z-[100000]">
            {/* Close Button Top-Right */}
            <button
              type="button"
              onClick={() => setConfirmModal(false)}
              disabled={submitting}
              className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-y-auto pr-1">
              <div className="w-14 h-14 bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <ShieldCheck className="w-8 h-8 text-[#7B1436]" />
              </div>

              <div className="text-center mb-4">
                <span className="px-3 py-1 rounded-full bg-[#FDF2F4] text-[#7B1436] border border-[#F0C4CE] text-[11px] font-bold uppercase tracking-wider inline-block mb-1.5">
                  Final Ballot Verification
                </span>
                <h3 className="text-xl font-bold text-[#122147] tracking-tight">
                  Confirm Your Official Vote
                </h3>
                <p className="text-xs text-stone-500 mt-1 font-normal leading-relaxed">
                  Please review your choices below. <strong>Once submitted, your vote is recorded permanently in the election vault and cannot be changed or resubmitted.</strong>
                </p>
              </div>

              {/* Selected Candidates Review List */}
              <div className="my-4 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {Object.entries(postsMap).map(([postId, postData]) => {
                  const { postConfig, candidates: postCands } = postData;
                  const isDual = postConfig.seats === 2 && postConfig.genderRule === '1_boy_1_girl';
                  
                  let chosenDetails: { name: string; tag?: string }[] = [];
                  if (!isDual) {
                    const c = postCands.find((x) => x.id === selectedSingleVotes[postId]);
                    if (c) chosenDetails.push({ name: c.name });
                  } else {
                    const dual = selectedDualVotes[postId] || {};
                    if (dual.boy) {
                      const b = postCands.find((x) => x.id === dual.boy);
                      if (b) chosenDetails.push({ name: b.name, tag: 'Boy Winner' });
                    }
                    if (dual.girl) {
                      const g = postCands.find((x) => x.id === dual.girl);
                      if (g) chosenDetails.push({ name: g.name, tag: 'Girl Winner' });
                    }
                    if (dual.anySelected) {
                      dual.anySelected.forEach((id) => {
                        const c = postCands.find((x) => x.id === id);
                        if (c && !chosenDetails.some((d) => d.name === c.name)) chosenDetails.push({ name: c.name });
                      });
                    }
                  }

                  return (
                    <div
                      key={postId}
                      className="p-3.5 bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-[#7B1436] font-bold uppercase tracking-wider block">
                          {postData.postName}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {chosenDetails.length > 0 ? (
                            chosenDetails.map((item, idx) => (
                              <p key={idx} className="font-bold text-[#122147] text-xs truncate">
                                {item.tag && (
                                  <span className="text-[10px] font-semibold text-[#A37332] mr-1.5 bg-[#FAF3E8] px-1.5 py-0.5 rounded border border-[#E8D3B5]">
                                    {item.tag}
                                  </span>
                                )}
                                {item.name}
                              </p>
                            ))
                          ) : (
                            <span className="text-stone-400 italic">None Selected</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0 ml-2">
                        ✓ Selected
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Strict Secret & Final Notice */}
              <div className="p-3 bg-[#FAF3E8] border border-[#E8D3B5] rounded-2xl text-[#A37332] text-xs flex items-center gap-2.5 mb-4">
                <Lock className="w-4 h-4 text-[#C59048] shrink-0" />
                <span className="font-medium text-[11px] leading-tight">
                  Your ballot is confidential, encrypted, and strictly limited to 1 submission per student.
                </span>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FDF2F4]/70 border border-[#F0C4CE] cursor-pointer mb-5 select-none">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#7B1436] focus:ring-[#7B1436] cursor-pointer shrink-0"
                />
                <span className="text-xs font-semibold text-[#7B1436] leading-tight">
                  I confirm that my selections above are final and I want to submit my official vote.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-[#EAE3D9]">
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-full transition-all cursor-pointer"
              >
                Change Choices
              </button>
              <button
                type="button"
                onClick={handleSubmitBallot}
                disabled={!confirmChecked || submitting}
                className="flex-1 px-5 py-3 bg-[#7B1436] hover:bg-[#5e0e28] text-white font-bold text-xs rounded-full transition-all flex items-center justify-center gap-2 shadow-md shadow-[#7B1436]/20 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C59048]" />
                    <span>Submitting Vote...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Confirm &amp; Submit Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * Individual Candidate Selection Card (Aadhaar / ID Card Inspired Clean Design)
 */
function CandidateCard({
  cand,
  isSelected,
  onSelect,
  isDualGenderPost = false,
}: {
  cand: Candidate;
  isSelected: boolean;
  onSelect: () => void;
  isDualGenderPost?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // Check if manifesto is meaningful (not empty, not default placeholder)
  const hasRealManifesto =
    cand.manifesto &&
    cand.manifesto.trim().length > 0 &&
    !cand.manifesto.toLowerCase().includes('dedicated to student leadership');

  return (
    <div
      onClick={onSelect}
      className={`relative p-5 sm:p-6 rounded-3xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'bg-[#FDF6F7] border-[#7B1436] shadow-lg ring-2 ring-[#C59048]/30 scale-[1.01]'
          : 'bg-white border-[#EAE3D9] hover:border-[#C59048] hover:bg-[#FAF7F2]/40 hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div>
        {/* ID Card Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[#EAE3D9]/70">
          <span
            className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${
              isDualGenderPost
                ? cand.gender === 'Female'
                  ? 'bg-[#FDF2F4] text-[#7B1436] border-[#F0C4CE]'
                  : 'bg-[#F0F4FA] text-[#122147] border-[#CBD5E1]'
                : 'bg-[#FAF3E8] text-[#7B1436] border-[#E8D3B5]'
            }`}
          >
            {isDualGenderPost
              ? (cand.gender === 'Female' ? 'Girl Nominee' : 'Boy Nominee')
              : 'Official Nominee'}
          </span>

          {/* Radio Selection Indicator */}
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              isSelected
                ? 'border-[#7B1436] bg-[#7B1436]'
                : 'border-stone-300 bg-white'
            }`}
          >
            {isSelected && (
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            )}
          </div>
        </div>

        {/* Aadhaar / ID Layout: Large Photo on Left, Clear Details on Right */}
        <div className="flex items-start gap-4">
          {/* Big ID Photo */}
          <div className="shrink-0">
            {cand.photoURL && !imgFailed ? (
              <img
                src={cand.photoURL}
                alt={cand.name}
                onError={() => setImgFailed(true)}
                className={`w-20 h-24 sm:w-24 sm:h-28 rounded-2xl object-cover object-top border-2 shadow-xs ${
                  isSelected ? 'border-[#7B1436]' : 'border-[#E8D3B5]'
                }`}
              />
            ) : (
              <div
                className={`w-20 h-24 sm:w-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center font-bold text-3xl shrink-0 shadow-xs border-2 ${
                  isSelected
                    ? 'bg-[#7B1436] text-white border-[#7B1436]'
                    : 'bg-[#FAF3E8] text-[#7B1436] border-[#E8D3B5]'
                }`}
              >
                <span>{cand.name.charAt(0).toUpperCase()}</span>
                <span className="text-[9px] font-medium tracking-wider uppercase opacity-70 mt-1">Photo</span>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <h4 className="text-base sm:text-lg font-bold text-[#122147] leading-snug tracking-tight truncate">
              {cand.name}
            </h4>

            {cand.usn && (
              <div className="text-xs font-mono font-bold text-[#7B1436] bg-[#FAF3E8] px-2.5 py-0.5 rounded-md border border-[#E8D3B5] inline-block">
                USN: {cand.usn}
              </div>
            )}

            <div className="text-xs text-stone-600 space-y-0.5 pt-0.5">
              <p>
                <span className="text-stone-400 font-medium">Year:</span>{' '}
                <strong className="text-[#122147] font-semibold">{cand.year || 'Student'}</strong>
              </p>
              {cand.department && (
                <p className="leading-snug">
                  <span className="text-stone-400 font-medium">Branch:</span>{' '}
                  <strong className="text-[#122147] font-semibold">{cand.department}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Vision Statement / Manifesto (Rendered only if provided by admin) */}
        {hasRealManifesto && (
          <div className="mt-4 p-3 bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl text-xs text-stone-600 italic leading-relaxed">
            &ldquo;{cand.manifesto}&rdquo;
          </div>
        )}
      </div>

      {/* Select Status Footer */}
      <div className="mt-4 pt-3 border-t border-[#EAE3D9]/60 flex items-center justify-between text-xs">
        <span
          className={`font-semibold text-xs ${
            isSelected ? 'text-[#7B1436]' : 'text-stone-400'
          }`}
        >
          {isSelected ? '✓ Candidate Selected' : 'Click card to select'}
        </span>
        {isSelected && (
          <span className="text-[11px] text-[#A37332] font-semibold bg-[#FAF3E8] px-2.5 py-0.5 rounded-full border border-[#E8D3B5]">
            Vote Allocated
          </span>
        )}
      </div>
    </div>
  );
}
