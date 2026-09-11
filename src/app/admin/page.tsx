'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PostResult, Candidate } from '@/lib/server/voting';
import { OFFICIAL_COUNCIL_POSTS } from '@/lib/constants';
import { downloadWinnersDocument } from '@/lib/export-report';
import SMVITMLogo from '@/components/SMVITMLogo';
import { 
  ShieldCheck, 
  LogOut, 
  RefreshCcw, 
  Award, 
  BarChart3, 
  Lock, 
  KeyRound, 
  Users, 
  Clock, 
  CheckSquare, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Trash2, 
  Download,
  Share2,
  Copy,
  PlusCircle,
  UserPlus,
  Radio,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Pencil,
  X
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();

  // Admin Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loginEmail, setLoginEmail] = useState('admin@sode-edu.in');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [forceUnlocking, setForceUnlocking] = useState(false);

  // Tab & Filter State
  const [activeTab, setActiveTab] = useState<'results' | 'candidates' | 'settings'>('results');
  const [semesterFilter, setSemesterFilter] = useState<'all' | '6th' | '4th'>('all');
  const [resultsLoading, setResultsLoading] = useState(false);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [recentTimeLogs, setRecentTimeLogs] = useState<any[]>([]);

  // Election Status & Sharing State (Inactive until admin activates)
  const [isBallotPublished, setIsBallotPublished] = useState(false);
  const [votingOpen, setVotingOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Candidate Management State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateFormOpen, setCandidateFormOpen] = useState(false);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [candidateNotice, setCandidateNotice] = useState<string | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  // New Candidate Form Fields
  const [newCandName, setNewCandName] = useState('');
  const [newCandUsn, setNewCandUsn] = useState('');
  const [newCandPostId, setNewCandPostId] = useState(OFFICIAL_COUNCIL_POSTS[0].id);
  const [newCandYear, setNewCandYear] = useState('3rd Year');
  const [newCandSemester, setNewCandSemester] = useState('6th');
  const [newCandDept, setNewCandDept] = useState('Artificial Intelligence & Data Science');
  const [newCandGender, setNewCandGender] = useState<'Male' | 'Female'>('Male');
  const [newCandPhoto, setNewCandPhoto] = useState('');
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [newCandManifesto, setNewCandManifesto] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPostForForm = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === newCandPostId) || OFFICIAL_COUNCIL_POSTS[0];
  const isSingleSeatPost = selectedPostForForm.seats === 1;

  // Compress uploaded photo to a lightweight canvas thumbnail (< 25KB)
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError(null);
    setCompressingPhoto(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 280; // Small square avatar dimension
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress JPEG at 70% quality: resulting size typically 10KB - 22KB
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setNewCandPhoto(compressedDataUrl);
          } else {
            setPhotoUploadError('Could not process image on canvas.');
          }
        } catch (err) {
          setPhotoUploadError('Image compression failed. Please try a different photo.');
        } finally {
          setCompressingPhoto(false);
        }
      };
      img.onerror = () => {
        setPhotoUploadError('Failed to read image file.');
        setCompressingPhoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setPhotoUploadError('Error opening image file.');
      setCompressingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  // Credentials Change State (Email & Password)
  const [currentCredPassword, setCurrentCredPassword] = useState('');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [confirmAdminPasswordInput, setConfirmAdminPasswordInput] = useState('');
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [credentialsSuccess, setCredentialsSuccess] = useState<string | null>(null);

  // Reset Votes Modal State
  const [resetVotesModalOpen, setResetVotesModalOpen] = useState(false);
  const [resettingVotes, setResettingVotes] = useState(false);
  const [resetVotesConfirmed, setResetVotesConfirmed] = useState(false);

  // Reset Candidates Modal State
  const [resetCandidatesModalOpen, setResetCandidatesModalOpen] = useState(false);
  const [resettingCandidates, setResettingCandidates] = useState(false);
  const [resetCandidatesConfirmed, setResetCandidatesConfirmed] = useState(false);

  // Edit Candidate Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCandId, setEditCandId] = useState('');
  const [editCandName, setEditCandName] = useState('');
  const [editCandUsn, setEditCandUsn] = useState('');
  const [editCandPostId, setEditCandPostId] = useState(OFFICIAL_COUNCIL_POSTS[0].id);
  const [editCandYear, setEditCandYear] = useState('3rd Year');
  const [editCandSemester, setEditCandSemester] = useState('6th');
  const [editCandDept, setEditCandDept] = useState('Artificial Intelligence & Data Science');
  const [editCandGender, setEditCandGender] = useState<'Male' | 'Female'>('Male');
  const [editCandPhoto, setEditCandPhoto] = useState('');
  const [editCandManifesto, setEditCandManifesto] = useState('');
  const [compressingEditPhoto, setCompressingEditPhoto] = useState(false);
  const [savingEditCandidate, setSavingEditCandidate] = useState(false);
  const [editCandidateError, setEditCandidateError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPostForEdit = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === editCandPostId) || OFFICIAL_COUNCIL_POSTS[0];
  const isSingleSeatEditPost = selectedPostForEdit.seats === 1;

  const [hasDownloadedDoc, setHasDownloadedDoc] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Verify admin session on mount (Requires explicit login on fresh visit)
  useEffect(() => {
    try {
      localStorage.removeItem('ignite_admin_auth');
      localStorage.removeItem('smvitm_admin_auth');
    } catch {}

    const saved = sessionStorage.getItem('smvitm_admin_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email && parsed.sessionId) {
          fetch('/api/admin/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: parsed.sessionId }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && !data.expired) {
                setIsAdminLoggedIn(true);
                setAdminEmail(parsed.email);
                setSessionId(parsed.sessionId);
                setNewAdminEmailInput(parsed.email);
              } else {
                sessionStorage.removeItem('smvitm_admin_session');
                setIsAdminLoggedIn(false);
              }
            })
            .catch(() => {
              sessionStorage.removeItem('smvitm_admin_session');
              setIsAdminLoggedIn(false);
            })
            .finally(() => {
              setCheckingAuth(false);
            });
          return;
        }
      } catch {
        sessionStorage.removeItem('smvitm_admin_session');
      }
    }
    setIsAdminLoggedIn(false);
    setCheckingAuth(false);
  }, []);

  // Heartbeat to keep single session active
  useEffect(() => {
    if (isAdminLoggedIn && sessionId) {
      fetch('/api/admin/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});

      heartbeatIntervalRef.current = setInterval(() => {
        fetch('/api/admin/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
      }, 25000);

      return () => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      };
    }
  }, [isAdminLoggedIn, sessionId]);

  // Load results and candidates
  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchResults();
      fetchCandidates();
      fetchElectionStatus();
    }
  }, [isAdminLoggedIn, semesterFilter]);

  // Live auto-polling for election results and election status every 3 seconds while logged in
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const interval = setInterval(() => {
      fetchResults(true);
      fetchElectionStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isAdminLoggedIn, semesterFilter]);

  const fetchResults = async (silent = false) => {
    if (!silent) setResultsLoading(true);
    try {
      const url = semesterFilter === 'all' 
        ? `/api/votes/results?t=${Date.now()}` 
        : `/api/votes/results?semester=${semesterFilter}&t=${Date.now()}`;

      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPostResults(data.postResults || []);
        setTotalVotes(data.totalVotes || 0);
        setTotalVoters(data.totalVoters || 0);
        setRecentTimeLogs(data.recentTimeLogs || []);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      if (!silent) setResultsLoading(false);
    }
  };

  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const res = await fetch(`/api/admin/candidates?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const fetchElectionStatus = async () => {
    try {
      const res = await fetch(`/api/admin/election-status?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setIsBallotPublished(data.status?.isPublished ?? false);
        setVotingOpen(data.status?.votingOpen ?? false);
      }
    } catch (err) {
      console.error('Error fetching election status:', err);
    }
  };

  const handleToggleElectionStatus = async () => {
    const nextPublished = !isBallotPublished;
    setIsBallotPublished(nextPublished);
    setVotingOpen(nextPublished);
    setTogglingStatus(true);
    try {
      const res = await fetch(`/api/admin/election-status?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: nextPublished, votingOpen: nextPublished }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setIsBallotPublished(data.status.isPublished);
        setVotingOpen(data.status.votingOpen);
        setSeedNotice(data.message || (nextPublished ? 'Voting window is now OPEN.' : 'Voting window is now CLOSED.'));
      } else {
        setIsBallotPublished(!nextPublished);
        setVotingOpen(!nextPublished);
      }
    } catch (err: any) {
      console.error('Error toggling status:', err);
      setIsBallotPublished(!nextPublished);
      setVotingOpen(!nextPublished);
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCandidateError(null);
    setCandidateNotice(null);

    if (!newCandName.trim() || !newCandUsn.trim()) {
      setCandidateError('Please enter candidate Name and USN.');
      return;
    }

    setSavingCandidate(true);
    try {
      const postObj = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === newCandPostId);
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCandName,
          usn: newCandUsn,
          postId: newCandPostId,
          postName: postObj?.name || newCandPostId,
          year: newCandYear,
          semester: newCandSemester,
          department: newCandDept,
          gender: newCandGender,
          photoURL: newCandPhoto,
          manifesto: newCandManifesto,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add candidate');

      if (data.candidate) {
        setCandidates((prev) => [data.candidate, ...prev.filter((c) => c.id !== data.candidate.id)]);
      }

      setCandidateNotice(`Candidate "${newCandName}" added successfully.`);
      setNewCandName('');
      setNewCandUsn('');
      setNewCandPhoto('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNewCandManifesto('');
      setCandidateFormOpen(false);
      fetchCandidates();
      fetchResults();
    } catch (err: any) {
      setCandidateError(err.message || 'Error creating candidate.');
    } finally {
      setSavingCandidate(false);
    }
  };

  const handleDeleteCandidate = async (candidateId: string, candName: string) => {
    if (!confirm(`Are you sure you want to remove candidate "${candName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/candidates?id=${encodeURIComponent(candidateId)}`, { method: 'DELETE' });
      if (res.ok) {
        setCandidateNotice(`Candidate "${candName}" removed.`);
        setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
        fetchCandidates();
        fetchResults();
      }
    } catch (err) {
      console.error('Error deleting candidate:', err);
    }
  };

  const handleOpenEditModal = (cand: Candidate) => {
    setEditCandId(cand.id);
    setEditCandName(cand.name);
    setEditCandUsn(cand.usn || '');
    setEditCandPostId(cand.postId);
    setEditCandYear(cand.year || '3rd Year');
    setEditCandSemester(cand.semester || '6th');
    setEditCandDept(cand.department || 'Artificial Intelligence & Data Science');
    setEditCandGender(cand.gender === 'Female' ? 'Female' : 'Male');
    setEditCandPhoto(cand.photoURL || '');
    setEditCandManifesto(cand.manifesto || '');
    setEditCandidateError(null);
    setEditModalOpen(true);
  };

  const handleEditPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditCandidateError(null);
    setCompressingEditPhoto(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
            setEditCandPhoto(compressedDataUrl);
          } else {
            setEditCandidateError('Could not process image on canvas.');
          }
        } catch (err) {
          setEditCandidateError('Image compression failed. Please try a different photo.');
        } finally {
          setCompressingEditPhoto(false);
        }
      };
      img.onerror = () => {
        setEditCandidateError('Failed to read image file.');
        setCompressingEditPhoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setEditCandidateError('Error opening image file.');
      setCompressingEditPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCandName.trim() || !editCandUsn.trim()) {
      setEditCandidateError('Name and USN are required.');
      return;
    }

    setSavingEditCandidate(true);
    setEditCandidateError(null);
    try {
      const postObj = OFFICIAL_COUNCIL_POSTS.find((p) => p.id === editCandPostId);
      const res = await fetch('/api/admin/candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editCandId,
          updates: {
            name: editCandName.trim(),
            usn: editCandUsn.trim().toUpperCase(),
            postId: editCandPostId,
            postName: postObj?.name || editCandPostId,
            year: editCandYear,
            semester: editCandSemester,
            department: editCandDept,
            gender: editCandGender,
            photoURL: editCandPhoto,
            manifesto: editCandManifesto.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update candidate');

      setCandidateNotice(`Candidate "${editCandName}" updated successfully.`);
      setEditModalOpen(false);
      fetchCandidates();
      fetchResults();
    } catch (err: any) {
      setEditCandidateError(err.message || 'Error updating candidate.');
    } finally {
      setSavingEditCandidate(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsError(null);
    setCredentialsSuccess(null);

    if (!currentCredPassword) {
      setCredentialsError('Current admin password is required to verify your authorization.');
      return;
    }

    if (newAdminPasswordInput && newAdminPasswordInput !== confirmAdminPasswordInput) {
      setCredentialsError('New password and confirm password do not match.');
      return;
    }

    if (newAdminPasswordInput && newAdminPasswordInput.length < 6) {
      setCredentialsError('New password must be at least 6 characters.');
      return;
    }

    setCredentialsLoading(true);
    try {
      const res = await fetch('/api/admin/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentEmail: adminEmail,
          currentPassword: currentCredPassword,
          newEmail: newAdminEmailInput,
          newPassword: newAdminPasswordInput || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update credentials.');

      setCredentialsSuccess(data.message || 'Admin credentials updated successfully!');
      if (data.updatedEmail) {
        setAdminEmail(data.updatedEmail);
        const saved = sessionStorage.getItem('smvitm_admin_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.email = data.updatedEmail;
          sessionStorage.setItem('smvitm_admin_session', JSON.stringify(parsed));
        }
      }
      setCurrentCredPassword('');
      setNewAdminPasswordInput('');
      setConfirmAdminPasswordInput('');
    } catch (err: any) {
      setCredentialsError(err.message || 'Failed to update credentials.');
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    setIsSessionLocked(false);

    const clientSessionId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          sessionId: clientSessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.inUse || res.status === 409) {
          setIsSessionLocked(true);
          throw new Error('The Admin Portal is currently in use by someone else. Only one administrator may be logged in at a time.');
        }
        throw new Error(data.error || 'Invalid admin credentials');
      }

      setIsAdminLoggedIn(true);
      setAdminEmail(data.email || loginEmail);
      setSessionId(clientSessionId);
      setNewAdminEmailInput(data.email || loginEmail);

      sessionStorage.setItem('smvitm_admin_session', JSON.stringify({
        email: data.email || loginEmail,
        sessionId: clientSessionId,
      }));
      try {
        localStorage.removeItem('ignite_admin_auth');
        localStorage.removeItem('smvitm_admin_auth');
      } catch {}
    } catch (err: any) {
      setLoginError(err.message || 'Failed to log in to Admin Portal.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleForceRelease = async () => {
    setForceUnlocking(true);
    try {
      await fetch('/api/admin/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRelease: true }),
      });
      setIsSessionLocked(false);
      setLoginError(null);
      setSeedNotice('Previous active session was released. You may now log in.');
    } catch {
      setLoginError('Could not release previous session.');
    } finally {
      setForceUnlocking(false);
    }
  };

  const handleAdminLogout = async () => {
    if (sessionId) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    sessionStorage.removeItem('smvitm_admin_session');
    try {
      localStorage.removeItem('ignite_admin_auth');
      localStorage.removeItem('smvitm_admin_auth');
    } catch {}
    setIsAdminLoggedIn(false);
    setAdminEmail('');
    setSessionId('');
    setLoginPassword('');
  };

  const handleDownloadWinnersReport = () => {
    downloadWinnersDocument(postResults, totalVotes, totalVoters);
    setHasDownloadedDoc(true);
  };

  const handleResetVotes = async () => {
    setResettingVotes(true);
    try {
      const res = await fetch(`/api/admin/reset-votes?t=${Date.now()}`, { 
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache',
          'Pragma': 'no-cache',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset votes');

      setTotalVotes(0);
      setTotalVoters(0);
      setRecentTimeLogs([]);
      setPostResults((prev) =>
        prev.map((pr) => ({
          ...pr,
          totalVotesInPost: 0,
          candidates: pr.candidates.map((c) => ({
            ...c,
            votes: 0,
            percentage: 0,
            isLeading: false,
            winnerCategory: undefined,
          })),
          declaredWinners: [],
        }))
      );
      setResetVotesModalOpen(false);
      setResetVotesConfirmed(false);
      setSeedNotice(data.message || 'All recorded votes and ballots have been successfully cleared from database and frontend.');
      fetchResults();
    } catch (err: any) {
      alert(err.message || 'Error resetting votes.');
    } finally {
      setResettingVotes(false);
    }
  };

  const handleResetCandidates = async () => {
    setResettingCandidates(true);
    try {
      const res = await fetch('/api/admin/reset-candidates', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset candidates');

      setCandidates([]);
      setResetCandidatesModalOpen(false);
      setResetCandidatesConfirmed(false);
      setCandidateNotice(data.message || 'All candidate registrations have been successfully deleted.');
      fetchCandidates();
      fetchResults();
    } catch (err: any) {
      alert(err.message || 'Error resetting candidates.');
    } finally {
      setResettingCandidates(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF7F2] text-[#122147]">
        <SMVITMLogo size="lg" showText={false} className="animate-bounce mb-4" />
        <p className="font-outfit font-semibold text-xs text-stone-500 uppercase tracking-widest">
          Authenticating Election Commission Session...
        </p>
      </div>
    );
  }

  // ==========================================
  // 1. ADMIN LOGIN VIEW
  // ==========================================
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-radial-warm flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#C59048]/20 selection:text-[#7B1436] text-[#122147]">
        <div className="w-full max-w-5xl flex items-center justify-between py-2 text-xs font-semibold text-stone-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
            <span className="font-outfit font-bold text-[#122147]">Election Commission Secure Portal</span>
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-[#A37332]">SMVITM Bantakal, Udupi</span>
        </div>

        <div className="max-w-md w-full my-auto py-6 flex flex-col items-center">
          <SMVITMLogo size="hero" showText={true} className="mb-6" />

          <div className="w-full bg-white rounded-3xl shadow-xl border border-[#EAE3D9] p-7 sm:p-9 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7B1436] via-[#C59048] to-[#122147]" />

            <div className="text-center mb-6">
              <h2 className="font-outfit text-2xl font-bold text-[#122147]">
                Administrator Login
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Authorized Personnel Only • Single Session Lock
              </p>
            </div>

            {isSessionLocked && (
              <div className="mb-6 p-4 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-xs text-[#7B1436] space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-[#7B1436]" />
                  <span>Portal Already in Use</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Another administrator is currently active. For security, only one session is permitted. If the previous tab was closed, you can force release the lock.
                </p>
                <button
                  type="button"
                  onClick={handleForceRelease}
                  disabled={forceUnlocking}
                  className="w-full py-2 bg-[#7B1436] hover:bg-[#931841] text-white font-outfit font-bold text-xs rounded-full transition-all cursor-pointer"
                >
                  {forceUnlocking ? 'Releasing Session...' : 'Force Release Previous Session'}
                </button>
              </div>
            )}

            {loginError && !isSessionLocked && (
              <div className="mb-6 p-4 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-[#7B1436] text-xs font-medium flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#7B1436] mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder="admin@sode-edu.in"
                  className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] focus:outline-none focus:ring-2 focus:ring-[#C59048]/40 text-sm font-outfit bg-[#FAF7F2]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] focus:outline-none focus:ring-2 focus:ring-[#C59048]/40 text-sm font-outfit bg-[#FAF7F2]/50 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn || isSessionLocked}
                className="w-full py-3.5 bg-[#581c38] hover:bg-[#431229] text-white font-outfit font-bold text-sm rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loggingIn ? 'Authenticating...' : 'Sign In as Administrator'}
              </button>
            </form>
          </div>
        </div>

        <footer className="w-full max-w-5xl py-4 text-center text-xs text-stone-400">
          Shri Madhwa Vadiraja Institute of Technology &amp; Management • Election Commission Vault
        </footer>
      </div>
    );
  }

  // ==========================================
  // 2. ADMIN MAIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#122147] font-sans pb-28 selection:bg-[#C59048]/20 selection:text-[#7B1436]">
      {/* Top Navbar in Clean Ivory/White */}
      <header className="bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE3D9]/80 sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <SMVITMLogo size="sm" showText={true} lightText={false} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAdminLogout}
              className="px-4 py-2 rounded-full bg-[#7B1436]/10 hover:bg-[#7B1436] text-[#7B1436] hover:text-white border border-[#7B1436]/25 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Status & Quick Action Bar */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Admin Details */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF3E8] text-[#7B1436] border border-[#E8D3B5] flex items-center justify-center font-outfit font-bold text-2xl shrink-0 shadow-2xs">
                A
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-outfit font-bold text-[#122147]">
                    Election Administrator
                  </h2>
                  <span className="px-3 py-0.5 bg-[#FAF3E8] text-[#A37332] text-xs font-semibold rounded-full border border-[#E8D3B5]">
                    SMVITM College
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-stone-500 font-normal">
                  <span className="font-mono text-stone-700 font-medium">{adminEmail || 'admin@sode-edu.in'}</span>
                  <span>•</span>
                  <span className={isBallotPublished ? "text-emerald-700 font-medium flex items-center gap-1.5" : "text-stone-500 font-medium flex items-center gap-1.5"}>
                    <span className={`w-2 h-2 rounded-full ${isBallotPublished ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                    {isBallotPublished ? 'Voting Active' : 'Voting Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Activate / Deactivate Voting Toggle */}
              <button
                onClick={handleToggleElectionStatus}
                disabled={togglingStatus}
                className={`px-5 py-2.5 rounded-full text-xs font-outfit font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs border ${
                  isBallotPublished
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isBallotPublished ? 'text-emerald-600 animate-pulse' : 'text-stone-400'}`} />
                <span>{isBallotPublished ? 'Voting Active (Click to Close)' : 'Voting Inactive (Click to Open)'}</span>
              </button>

              {/* Install PWA App Link */}
              <a
                href="/install"
                target="_blank"
                className="px-4 py-2.5 rounded-full text-xs font-outfit font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs border bg-[#FAF3E8] text-[#A37332] border-[#E8D3B5] hover:bg-[#F5E6D0]"
                title="Install PWA on voting tablets or view install instructions"
              >
                <Download className="w-3.5 h-3.5 text-[#C59048]" />
                <span>PWA Download Page</span>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Main Tabbed Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Navigation Tabs & Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-[#EAE3D9]">
          <div className="flex items-center gap-2 p-1.5 bg-[#EAE3D9]/60 rounded-2xl">
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-outfit font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'results'
                  ? 'bg-[#122147] text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#C59048]" />
              Results &amp; Winners
            </button>

            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-outfit font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'candidates'
                  ? 'bg-[#122147] text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-4 h-4 text-[#C59048]" />
              Add &amp; Manage Candidates ({candidates.length})
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-outfit font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#122147] text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-[#C59048]" />
              Admin Settings
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadWinnersReport}
              className="px-4 py-2.5 bg-[#FAF3E8] hover:bg-[#FAF3E8]/80 text-[#A37332] rounded-xl text-xs font-outfit font-bold uppercase tracking-wider transition-all border border-[#E8D3B5] shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C59048]" />
              Download Winners (.doc)
            </button>

            {/* Reset Votes Button */}
            <button
              onClick={() => setResetVotesModalOpen(true)}
              className="px-4 py-2.5 bg-[#FDF2F4] hover:bg-[#FBE4E8] text-[#7B1436] rounded-xl text-xs font-outfit font-bold uppercase tracking-wider transition-all border border-[#F0C4CE] shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Clear all cast ballots and voter records"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#7B1436]" />
              Reset Votes
            </button>

            {/* Reset Candidates Button */}
            <button
              onClick={() => setResetCandidatesModalOpen(true)}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-outfit font-bold uppercase tracking-wider transition-all border border-amber-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Delete all registered candidate records"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-800" />
              Reset Candidates
            </button>

            {/* Live Polling Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Updates</span>
            </div>

            <button
              onClick={() => { fetchResults(); fetchCandidates(); }}
              disabled={resultsLoading || candidatesLoading}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-stone-700 rounded-xl border border-[#EAE3D9] shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh results and candidates immediately"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${resultsLoading || candidatesLoading ? 'animate-spin text-[#7B1436]' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {seedNotice && (
          <div className="mb-6 p-4 bg-[#FAF3E8] border border-[#E8D3B5] rounded-2xl text-[#A37332] text-xs font-semibold flex items-center justify-between shadow-xs">
            <span>{seedNotice}</span>
            <button onClick={() => setSeedNotice(null)} className="text-[#A37332] hover:text-[#7B1436] font-bold ml-4">✕</button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: ELECTION RESULTS & LIVE TALLY                      */}
        {/* ========================================================= */}
        {activeTab === 'results' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-[10px] font-outfit font-bold uppercase tracking-widest text-[#7B1436]">Total Votes Cast</span>
                  <CheckSquare className="w-5 h-5 text-[#7B1436]" />
                </div>
                <div className="text-3xl font-outfit font-bold text-[#122147]">{totalVotes}</div>
                <p className="text-xs text-stone-400 mt-1 font-normal">Total student votes recorded</p>
              </div>

              <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-[10px] font-outfit font-bold uppercase tracking-widest text-emerald-800">Students Voted</span>
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-outfit font-bold text-[#122147]">{totalVoters}</div>
                <p className="text-xs text-emerald-700 mt-1 font-normal">Number of students who have voted</p>
              </div>

              <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-[10px] font-outfit font-bold uppercase tracking-widest text-[#A37332]">Council Positions</span>
                  <Award className="w-5 h-5 text-[#C59048]" />
                </div>
                <div className="text-3xl font-outfit font-bold text-[#122147]">{OFFICIAL_COUNCIL_POSTS.length}</div>
                <p className="text-xs text-stone-400 mt-1 font-normal">Total positions available</p>
              </div>
            </div>

            {/* Post By Post Results Cards */}
            {postResults.length === 0 ? (
              <div className="bg-white border border-[#EAE3D9] rounded-3xl p-12 text-center shadow-sm">
                <Award className="w-10 h-10 text-[#C59048] mx-auto mb-3" />
                <h4 className="text-lg font-outfit font-bold text-[#122147]">No Election Tally Recorded Yet</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  When students cast their official ballots, live candidate votes, percentages, and declared winners will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {postResults.map((post) => (
                  <div
                    key={post.postId}
                    className="bg-white border border-[#EAE3D9] rounded-3xl p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#EAE3D9]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-[#FAF3E8] text-[#A37332] border border-[#E8D3B5] rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {post.seats === 2 ? '2 Winners (1 Boy & 1 Girl)' : '1 Winner (Open Contest)'}
                            </span>
                          </div>
                          <h3 className="text-lg font-outfit font-bold text-[#122147] mt-1.5">{post.postName}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-stone-400 font-semibold uppercase">Total Votes</span>
                          <p className="text-2xl font-outfit font-bold text-[#7B1436]">{post.totalVotes}</p>
                        </div>
                      </div>

                      {/* Candidate Bars */}
                      <div className="space-y-4">
                        {post.candidates.length === 0 ? (
                          <p className="text-xs text-stone-400 italic py-2">No candidates registered for this position yet.</p>
                        ) : (
                          post.candidates.map((cand) => (
                            <div key={cand.candidateId} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-outfit font-bold text-[#122147]">{cand.candidateName}</span>
                                  {post.seats === 2 && (
                                    <span className="text-[10px] text-stone-400 font-medium">({cand.gender})</span>
                                  )}
                                  {cand.usn && <span className="text-[10px] text-[#7B1436] font-mono font-bold">({cand.usn})</span>}
                                  {cand.winnerCategory && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#FAF3E8] text-[#A37332] border border-[#E8D3B5] rounded-full text-[10px] font-outfit font-bold">
                                      <Award className="w-3 h-3 text-[#C59048]" /> {cand.winnerCategory}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="font-bold text-[#122147]">{cand.votes} votes</span>
                                  <span className="text-stone-400">({cand.percentage}%)</span>
                                </div>
                              </div>

                              <div className="w-full bg-[#FAF7F2] rounded-full h-3 overflow-hidden border border-[#EAE3D9]">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    cand.isLeading
                                      ? 'bg-gradient-to-r from-[#C59048] to-[#E8D3B5]'
                                      : 'bg-gradient-to-r from-[#7B1436] to-[#931841]'
                                  }`}
                                  style={{ width: `${cand.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vote Audit Log (Time Log with Secret Ballot) */}
            <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#EAE3D9]">
                <div>
                  <h3 className="text-lg font-outfit font-bold text-[#122147] flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#C59048]" />
                    Chronological Vote Audit Log
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Plain-text timestamps with cryptographically encrypted ballots. Neither student voter identities nor individual candidate selections are exposed.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#A37332] uppercase tracking-wider px-3 py-1 bg-[#FAF3E8] border border-[#E8D3B5] rounded-full w-fit">
                  🔒 Zero-Knowledge Cryptographic Cipher
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EAE3D9] bg-[#FAF7F2] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 rounded-l-xl">Exact Time</th>
                      <th className="py-3 px-4">Contested Position</th>
                      <th className="py-3 px-4">Encrypted Ballot Cipher</th>
                      <th className="py-3 px-4">Anonymized Voter Token</th>
                      <th className="py-3 px-4 rounded-r-xl">Cryptographic Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE3D9]/60">
                    {recentTimeLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-stone-400 font-medium">
                          No votes recorded yet. Real student votes cast in the election portal will appear here with cryptographic encryption.
                        </td>
                      </tr>
                    ) : (
                      recentTimeLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-stone-600">{log.timestampFormatted}</td>
                          <td className="py-3 px-4 font-bold text-[#122147]">{log.postName}</td>
                          <td className="py-3 px-4 font-mono text-xs text-[#7B1436] font-bold">{log.encryptedBallotHash}</td>
                          <td className="py-3 px-4 font-mono text-stone-500 font-semibold">{log.anonymizedVoterToken}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Sealed
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MANAGE POSTS & CANDIDATES (ADD / DELETE)           */}
        {/* ========================================================= */}
        {activeTab === 'candidates' && (
          <div className="space-y-8">
            
            {/* Header & Add Candidate Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#EAE3D9] rounded-3xl p-6 shadow-sm">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-outfit font-bold text-[#122147]">
                    Official Election Candidates &amp; Nominees
                  </h3>
                  <span className="px-3 py-0.5 rounded-full text-xs font-outfit font-bold bg-[#FAF3E8] text-[#7B1436] border border-[#E8D3B5]">
                    {candidates.length} Registered
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Add candidates for each of the 7 council posts. If multiple candidates are nominated for a post, a competitive contest is established.
                </p>
              </div>

              <button
                onClick={() => setCandidateFormOpen(!candidateFormOpen)}
                className="px-5 py-2.5 rounded-full bg-[#581c38] hover:bg-[#431229] text-white font-outfit font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>{candidateFormOpen ? 'Close Form' : 'Add New Candidate'}</span>
              </button>
            </div>

            {candidateNotice && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
                <span>{candidateNotice}</span>
                <button onClick={() => setCandidateNotice(null)} className="text-emerald-800 font-bold ml-4">✕</button>
              </div>
            )}

            {candidateError && (
              <div className="p-4 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-[#7B1436] text-xs font-semibold flex items-center gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-[#7B1436]" />
                <span>{candidateError}</span>
              </div>
            )}

            {/* Collapsible Candidate Addition Form */}
            {candidateFormOpen && (
              <form onSubmit={handleCreateCandidate} className="bg-white border border-[#C59048]/40 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 animate-fade-in">
                <div className="border-b border-[#EAE3D9] pb-4">
                  <h4 className="text-lg font-outfit font-bold text-[#122147] flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#C59048]" />
                    Add Candidate Details
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Fill out the student details and select the designated election post.
                  </p>
                </div>

                {/* Multiple candidates help notice */}
                <div className="p-3.5 bg-[#FAF7F2] border border-[#E8D3B5] rounded-2xl flex items-start gap-2.5">
                  <span className="text-base leading-none">💡</span>
                  <div className="text-xs text-stone-700 leading-relaxed">
                    <strong className="text-[#122147]">Multiple Candidates for the Same Post:</strong> To register multiple people contesting for the same position (e.g. 2, 3, or more people standing for President), simply select the same post in the dropdown and save each candidate one by one. All candidates will automatically appear as competing options on the ballot!
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Select Post */}
                  <div>
                    <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                      Contested Council Post *
                    </label>
                    <select
                      value={newCandPostId}
                      onChange={(e) => setNewCandPostId(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                    >
                      {OFFICIAL_COUNCIL_POSTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.seats === 2 ? '2 Seats: 1 Boy & 1 Girl' : '1 Seat (Open Contest — 1 Winner)'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gender Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-outfit font-bold text-stone-700">
                        {isSingleSeatPost ? 'Candidate Gender (Profile Info)' : 'Candidate Gender (Boy / Girl Category) *'}
                      </label>
                      {isSingleSeatPost && (
                        <span className="text-[10px] font-bold text-[#7B1436] bg-[#FAF3E8] px-2 py-0.5 rounded border border-[#E8D3B5]">
                          Open Contest (1 Winner)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewCandGender('Male')}
                        className={`py-3 rounded-xl text-xs font-outfit font-bold transition-all border ${
                          newCandGender === 'Male'
                            ? 'bg-[#122147] text-white border-[#122147] shadow-xs'
                            : 'bg-[#FAF7F2] text-stone-700 border-[#EAE3D9] hover:bg-stone-100'
                        }`}
                      >
                        Male / Boy
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCandGender('Female')}
                        className={`py-3 rounded-xl text-xs font-outfit font-bold transition-all border ${
                          newCandGender === 'Female'
                            ? 'bg-[#7B1436] text-white border-[#7B1436] shadow-xs'
                            : 'bg-[#FAF7F2] text-stone-700 border-[#EAE3D9] hover:bg-stone-100'
                        }`}
                      >
                        Female / Girl
                      </button>
                    </div>
                    {isSingleSeatPost && (
                      <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">
                        ℹ️ <strong>Open Competition:</strong> For 1-winner posts like {selectedPostForForm.name}, there are no separate boy/girl categories. All candidates compete directly against each other for 1 winning seat.
                      </p>
                    )}
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newCandName}
                      onChange={(e) => setNewCandName(e.target.value)}
                      required
                      placeholder="e.g. Aarav Shenoy"
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                    />
                  </div>

                  {/* USN */}
                  <div>
                    <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                      USN (University Seat Number) *
                    </label>
                    <input
                      type="text"
                      value={newCandUsn}
                      onChange={(e) => setNewCandUsn(e.target.value)}
                      required
                      placeholder="e.g. 4SO23AD005"
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                    />
                  </div>

                  {/* Year of Study */}
                  <div>
                    <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                      Year of Study *
                    </label>
                    <select
                      value={newCandYear}
                      onChange={(e) => {
                        setNewCandYear(e.target.value);
                        if (e.target.value === '1st Year') setNewCandSemester('2nd');
                        else if (e.target.value === '2nd Year') setNewCandSemester('4th');
                        else if (e.target.value === '3rd Year') setNewCandSemester('6th');
                        else setNewCandSemester('8th');
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>

                  {/* Department / Branch */}
                  <div>
                    <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                      Department / Branch
                    </label>
                    <input
                      type="text"
                      value={newCandDept}
                      onChange={(e) => setNewCandDept(e.target.value)}
                      placeholder="e.g. Artificial Intelligence & Data Science"
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                    />
                  </div>

                  {/* Candidate Photo (File Upload with Auto-Compression + Direct URL) */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-outfit font-bold text-stone-700">
                      Candidate Photo (Lightweight Auto-Compressed Upload or URL)
                    </label>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/webp, image/jpg"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />

                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={compressingPhoto}
                        className="px-4 py-2.5 rounded-xl border border-[#C59048] bg-[#FAF3E8] hover:bg-[#F5EAD7] text-[#7B1436] text-xs font-outfit font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs shrink-0"
                      >
                        <Upload className="w-4 h-4 text-[#C59048]" />
                        <span>{compressingPhoto ? 'Compressing Photo...' : 'Upload Photo from Device'}</span>
                      </button>

                      {/* Direct URL input fallback */}
                      <div className="relative flex-1 w-full">
                        <input
                          type="url"
                          value={newCandPhoto.startsWith('data:') ? '' : newCandPhoto}
                          onChange={(e) => setNewCandPhoto(e.target.value)}
                          placeholder={newCandPhoto.startsWith('data:') ? 'Photo attached from device (Auto-compressed <25KB)' : 'Or paste direct image URL (https://...)'}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-xs font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                        />
                      </div>
                    </div>

                    {photoUploadError && (
                      <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {photoUploadError}
                      </p>
                    )}

                    {/* Image Preview & Clear */}
                    {newCandPhoto && (
                      <div className="flex items-center gap-3 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl w-fit">
                        <img
                          src={newCandPhoto}
                          alt="Preview"
                          className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-2xs"
                        />
                        <div className="text-[11px] text-emerald-900">
                          <p className="font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {newCandPhoto.startsWith('data:') ? 'Photo Compressed & Ready (~15-20KB)' : 'URL Photo Attached'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewCandPhoto('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            Remove Photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manifesto */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                      Candidate Manifesto / Vision Statement
                    </label>
                    <textarea
                      value={newCandManifesto}
                      onChange={(e) => setNewCandManifesto(e.target.value)}
                      rows={3}
                      placeholder="Brief statement outlining candidate vision, initiatives, and goals..."
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE3D9]">
                  <button
                    type="button"
                    onClick={() => setCandidateFormOpen(false)}
                    className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-outfit font-bold hover:bg-stone-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCandidate}
                    className="px-7 py-2.5 rounded-full bg-[#581c38] hover:bg-[#431229] text-white text-xs font-outfit font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {savingCandidate ? 'Saving Candidate...' : 'Save & Register Candidate'}
                  </button>
                </div>
              </form>
            )}

            {/* List of 7 Posts with Nominated Candidates */}
            <div className="space-y-6">
              {OFFICIAL_COUNCIL_POSTS.map((post) => {
                const normPostId = post.id.toLowerCase().replace(/[-_ ]+/g, '_').trim();
                const postCands = candidates.filter((c) => {
                  const cNorm = (c.postId || '').toLowerCase().replace(/[-_ ]+/g, '_').trim();
                  return cNorm === normPostId || (c.postName && c.postName.toLowerCase().trim() === post.name.toLowerCase().trim());
                });
                const hasCompetition = postCands.length > post.seats;

                return (
                  <div key={post.id} className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-7 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#EAE3D9] gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-outfit font-bold text-[#122147]">
                            {post.name}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3E8] text-[#A37332] border border-[#E8D3B5]">
                            {post.seats === 2 ? '2 Winners: 1 Boy & 1 Girl' : '1 Winner'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{post.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasCompetition ? (
                          <span className="px-3 py-1 bg-[#FDF2F4] text-[#7B1436] border border-[#F0C4CE] rounded-full text-xs font-outfit font-bold">
                            ⚔️ Active Contest ({postCands.length} Candidates)
                          </span>
                        ) : postCands.length > 0 ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-outfit font-semibold">
                            ✓ {postCands.length} Candidate(s) Nominated
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-xs font-medium">
                            No Nominees Yet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Candidate Cards under this post */}
                    {postCands.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-3">
                        No candidates have been registered for this post. Click &ldquo;Add New Candidate&rdquo; above to register nominees.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {postCands.map((cand) => {
                          const hasRealManifesto =
                            cand.manifesto &&
                            cand.manifesto.trim().length > 0 &&
                            !cand.manifesto.toLowerCase().includes('dedicated to student leadership');

                          return (
                            <div
                              key={cand.id}
                              className="p-5 rounded-3xl border border-[#EAE3D9] bg-[#FAF7F2]/40 hover:bg-white hover:border-[#C59048] hover:shadow-sm transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-[#EAE3D9]/60">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    post.seats === 2 && post.genderRule === '1_boy_1_girl'
                                      ? cand.gender === 'Female'
                                        ? 'bg-[#FDF2F4] text-[#7B1436] border border-[#F0C4CE]'
                                        : 'bg-[#F0F4FA] text-[#122147] border border-[#CBD5E1]'
                                      : 'bg-[#FAF3E8] text-[#7B1436] border border-[#E8D3B5]'
                                  }`}>
                                    {post.seats === 2 && post.genderRule === '1_boy_1_girl'
                                      ? (cand.gender === 'Female' ? 'Girl Nominee' : 'Boy Nominee')
                                      : 'Contesting Candidate'}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(cand)}
                                      className="text-xs text-blue-700 hover:text-blue-900 font-outfit font-semibold flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
                                      title="Edit candidate details"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                                      className="text-xs text-red-600 hover:text-red-800 font-outfit font-semibold flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors"
                                      title="Remove candidate"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-start gap-3.5 mb-3">
                                  {cand.photoURL ? (
                                    <img
                                      src={cand.photoURL}
                                      alt={cand.name}
                                      className="w-16 h-20 rounded-2xl object-cover object-top border-2 border-[#E8D3B5] shrink-0 shadow-2xs"
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="w-16 h-20 rounded-2xl bg-[#FAF3E8] text-[#7B1436] border-2 border-[#E8D3B5] flex flex-col items-center justify-center font-outfit font-bold text-xl shrink-0 shadow-2xs">
                                      <span>{cand.name.charAt(0)}</span>
                                      <span className="text-[8px] font-medium tracking-wider uppercase opacity-60 mt-0.5">Photo</span>
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0 space-y-1">
                                    <h5 className="text-sm font-outfit font-bold text-[#122147] leading-tight truncate">
                                      {cand.name}
                                    </h5>
                                    <p className="text-xs font-mono text-[#7B1436] font-semibold bg-[#FAF3E8] px-2 py-0.5 rounded border border-[#E8D3B5] inline-block">
                                      {cand.usn}
                                    </p>
                                    <p className="text-xs text-stone-600"><span className="text-stone-400">Year:</span> <strong>{cand.year || '3rd Year'}</strong></p>
                                    {cand.department && (
                                      <p className="text-xs text-stone-600 leading-tight"><span className="text-stone-400">Branch:</span> <strong>{cand.department}</strong></p>
                                    )}
                                  </div>
                                </div>

                                {hasRealManifesto && (
                                  <p className="text-[11px] text-stone-600 italic line-clamp-2 bg-white/80 p-2.5 rounded-xl border border-[#EAE3D9] mt-2">
                                    &ldquo;{cand.manifesto}&rdquo;
                                  </p>
                                )}
                              </div>

                              {/* Admin Action Footer Bar */}
                              <div className="pt-3 mt-3.5 border-t border-[#EAE3D9] flex items-center justify-between gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(cand)}
                                  className="flex-1 py-2 px-3 bg-[#FAF3E8] hover:bg-[#F5EAD7] text-[#7B1436] border border-[#E8D3B5] rounded-xl text-xs font-outfit font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-95"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[#C59048]" />
                                  <span>Edit Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                                  className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-outfit font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-95"
                                  title="Remove candidate"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Additional / Custom Nominees Section */}
              {(() => {
                const customCands = candidates.filter((c) => {
                  const cNorm = (c.postId || '').toLowerCase().replace(/[-_ ]+/g, '_').trim();
                  return !OFFICIAL_COUNCIL_POSTS.some((p) => {
                    const pNorm = p.id.toLowerCase().replace(/[-_ ]+/g, '_').trim();
                    return pNorm === cNorm || (c.postName && c.postName.toLowerCase().trim() === p.name.toLowerCase().trim());
                  });
                });

                if (customCands.length === 0) return null;

                return (
                  <div className="bg-white border-2 border-amber-300/80 rounded-3xl p-6 sm:p-7 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#EAE3D9] gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-outfit font-bold text-[#122147]">
                            Additional / Other Nominees ({customCands.length})
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            Custom Post
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Candidates registered with custom or non-standard position titles.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customCands.map((cand) => (
                        <div
                          key={cand.id}
                          className="p-5 rounded-3xl border border-[#EAE3D9] bg-[#FAF7F2]/40 hover:bg-white hover:border-[#C59048] hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-[#EAE3D9]/60">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                {cand.postName || cand.postId || 'Custom Position'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(cand)}
                                  className="text-xs text-blue-700 hover:text-blue-900 font-outfit font-semibold flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
                                  title="Edit candidate details"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                                  className="text-xs text-red-600 hover:text-red-800 font-outfit font-semibold flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors"
                                  title="Remove candidate"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex items-start gap-3.5 mb-3">
                              {cand.photoURL ? (
                                <img
                                  src={cand.photoURL}
                                  alt={cand.name}
                                  className="w-16 h-20 rounded-2xl object-cover object-top border-2 border-[#E8D3B5] shrink-0 shadow-2xs"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-16 h-20 rounded-2xl bg-[#FAF3E8] text-[#7B1436] border-2 border-[#E8D3B5] flex flex-col items-center justify-center font-outfit font-bold text-xl shrink-0 shadow-2xs">
                                  <span>{cand.name.charAt(0)}</span>
                                  <span className="text-[8px] font-medium tracking-wider uppercase opacity-60 mt-0.5">Photo</span>
                                </div>
                              )}

                              <div className="flex-1 min-w-0 space-y-1">
                                <h5 className="text-sm font-outfit font-bold text-[#122147] leading-tight truncate">
                                  {cand.name}
                                </h5>
                                <p className="text-xs font-mono text-[#7B1436] font-semibold bg-[#FAF3E8] px-2 py-0.5 rounded border border-[#E8D3B5] inline-block">
                                  {cand.usn}
                                </p>
                                <p className="text-xs text-stone-600"><span className="text-stone-400">Year:</span> <strong>{cand.year || '3rd Year'}</strong></p>
                                {cand.department && (
                                  <p className="text-xs text-stone-600 leading-tight"><span className="text-stone-400">Branch:</span> <strong>{cand.department}</strong></p>
                                )}
                              </div>
                            </div>

                            {cand.manifesto && (
                              <p className="text-[11px] text-stone-600 italic line-clamp-2 bg-white/80 p-2.5 rounded-xl border border-[#EAE3D9] mt-2">
                                &ldquo;{cand.manifesto}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Admin Action Footer Bar */}
                          <div className="pt-3 mt-3.5 border-t border-[#EAE3D9] flex items-center justify-between gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(cand)}
                              className="flex-1 py-2 px-3 bg-[#FAF3E8] hover:bg-[#F5EAD7] text-[#7B1436] border border-[#E8D3B5] rounded-xl text-xs font-outfit font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-95"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#C59048]" />
                              <span>Edit Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-outfit font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-95"
                              title="Remove candidate"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: COMMISSION SETTINGS (EMAIL & PASSWORD)             */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="border-b border-[#EAE3D9] pb-4 mb-6">
                <h3 className="text-xl font-outfit font-bold text-[#122147] flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#C59048]" />
                  Administrator Credentials
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Change your administrative login email address and security password. Changes take effect immediately.
                </p>
              </div>

              {credentialsSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{credentialsSuccess}</span>
                </div>
              )}

              {credentialsError && (
                <div className="mb-6 p-4 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-[#7B1436] text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#7B1436]" />
                  <span>{credentialsError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    value={newAdminEmailInput}
                    onChange={(e) => setNewAdminEmailInput(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">Current active email: {adminEmail}</span>
                </div>

                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Current Password (Required for verification) *
                  </label>
                  <input
                    type="password"
                    value={currentCredPassword}
                    onChange={(e) => setCurrentCredPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                </div>

                <div className="pt-2 border-t border-[#EAE3D9]/60">
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    New Password (Leave blank to keep unchanged)
                  </label>
                  <input
                    type="password"
                    value={newAdminPasswordInput}
                    onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmAdminPasswordInput}
                    onChange={(e) => setConfirmAdminPasswordInput(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={credentialsLoading}
                  className="w-full py-3.5 bg-[#581c38] hover:bg-[#431229] text-white font-outfit font-bold text-sm rounded-full transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50 mt-2"
                >
                  {credentialsLoading ? 'Saving Changes...' : 'Update Admin Credentials'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* 1. Reset Votes Confirmation Modal */}
      {resetVotesModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border-2 border-red-300 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="w-14 h-14 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
              <RotateCcw className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-outfit font-bold text-[#122147] text-center">
              Reset All Election Votes?
            </h3>

            <p className="text-xs text-stone-600 text-center mt-2 leading-relaxed">
              This will permanently clear all <strong>cast ballots</strong>, <strong>mock/test votes</strong>, and <strong>voter records</strong> from Firestore so student voters can vote fresh. Candidates will <strong>NOT</strong> be deleted.
            </p>

            {!hasDownloadedDoc && (
              <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tip: Download the Winners Report (.doc) before clearing votes if needed.</span>
              </div>
            )}

            <div className="my-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="confirmResetVotes"
                checked={resetVotesConfirmed}
                onChange={(e) => setResetVotesConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="confirmResetVotes" className="text-xs text-stone-700 font-semibold cursor-pointer">
                I understand this will clear all votes and allow students to vote fresh.
              </label>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setResetVotesModalOpen(false); setResetVotesConfirmed(false); }}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-outfit font-bold text-xs rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetVotes}
                disabled={!resetVotesConfirmed || resettingVotes}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-outfit font-bold text-xs rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {resettingVotes ? 'Clearing Votes...' : 'Confirm Reset Votes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Reset Candidates Confirmation Modal */}
      {resetCandidatesModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border-2 border-amber-300 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-outfit font-bold text-[#122147] text-center">
              Delete All Candidates?
            </h3>

            <p className="text-xs text-stone-600 text-center mt-2 leading-relaxed">
              This will permanently delete all <strong>candidate records</strong> and nominations from Firestore. Cast votes will <strong>NOT</strong> be deleted.
            </p>

            <div className="my-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="confirmResetCandidates"
                checked={resetCandidatesConfirmed}
                onChange={(e) => setResetCandidatesConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="confirmResetCandidates" className="text-xs text-stone-700 font-semibold cursor-pointer">
                I understand this will remove all candidate entries.
              </label>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setResetCandidatesModalOpen(false); setResetCandidatesConfirmed(false); }}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-outfit font-bold text-xs rounded-full cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetCandidates}
                disabled={!resetCandidatesConfirmed || resettingCandidates}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white font-outfit font-bold text-xs rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {resettingCandidates ? 'Deleting Candidates...' : 'Confirm Delete Candidates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Candidate Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#EAE3D9] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#EAE3D9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF3E8] text-[#7B1436] border border-[#E8D3B5] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                  <Pencil className="w-5 h-5 text-[#C59048]" />
                </div>
                <div>
                  <h3 className="text-lg font-outfit font-bold text-[#122147]">
                    Edit Candidate Details
                  </h3>
                  <p className="text-xs text-stone-500">
                    Update candidate nomination, USN, branch, gender category, or photo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editCandidateError && (
              <div className="mb-5 p-4 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-[#7B1436] text-xs font-semibold flex items-center gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-[#7B1436] shrink-0" />
                <span>{editCandidateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCandidate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select Post */}
                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Contested Council Post *
                  </label>
                  <select
                    value={editCandPostId}
                    onChange={(e) => setEditCandPostId(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  >
                    {OFFICIAL_COUNCIL_POSTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.seats === 2 ? '2 Seats: 1 Boy & 1 Girl' : '1 Seat (Open Contest — 1 Winner)'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-outfit font-bold text-stone-700">
                      {isSingleSeatEditPost ? 'Candidate Gender (Profile Info)' : 'Candidate Gender (Boy / Girl Category) *'}
                    </label>
                    {isSingleSeatEditPost && (
                      <span className="text-[10px] font-bold text-[#7B1436] bg-[#FAF3E8] px-2 py-0.5 rounded border border-[#E8D3B5]">
                        Open Contest (1 Winner)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditCandGender('Male')}
                      className={`py-3 rounded-xl text-xs font-outfit font-bold transition-all border ${
                        editCandGender === 'Male'
                          ? 'bg-[#122147] text-white border-[#122147] shadow-xs'
                          : 'bg-[#FAF7F2] text-stone-700 border-[#EAE3D9] hover:bg-stone-100'
                      }`}
                    >
                      Male / Boy
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCandGender('Female')}
                      className={`py-3 rounded-xl text-xs font-outfit font-bold transition-all border ${
                        editCandGender === 'Female'
                          ? 'bg-[#7B1436] text-white border-[#7B1436] shadow-xs'
                          : 'bg-[#FAF7F2] text-stone-700 border-[#EAE3D9] hover:bg-stone-100'
                      }`}
                    >
                      Female / Girl
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editCandName}
                    onChange={(e) => setEditCandName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                </div>

                {/* USN */}
                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    USN (University Seat Number) *
                  </label>
                  <input
                    type="text"
                    value={editCandUsn}
                    onChange={(e) => setEditCandUsn(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                </div>

                {/* Year of Study */}
                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Year of Study *
                  </label>
                  <select
                    value={editCandYear}
                    onChange={(e) => {
                      setEditCandYear(e.target.value);
                      if (e.target.value === '1st Year') setEditCandSemester('2nd');
                      else if (e.target.value === '2nd Year') setEditCandSemester('4th');
                      else if (e.target.value === '3rd Year') setEditCandSemester('6th');
                      else setEditCandSemester('8th');
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Department / Branch
                  </label>
                  <input
                    type="text"
                    value={editCandDept}
                    onChange={(e) => setEditCandDept(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                </div>

                {/* Photo Upload & Preview */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-outfit font-bold text-stone-700">
                    Candidate Photo (Lightweight Auto-Compressed Upload or URL)
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/png, image/jpeg, image/webp, image/jpg"
                      onChange={handleEditPhotoFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={compressingEditPhoto}
                      className="px-4 py-2.5 rounded-xl border border-[#C59048] bg-[#FAF3E8] hover:bg-[#F5EAD7] text-[#7B1436] text-xs font-outfit font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs shrink-0"
                    >
                      <Upload className="w-4 h-4 text-[#C59048]" />
                      <span>{compressingEditPhoto ? 'Compressing Photo...' : 'Replace Photo from Device'}</span>
                    </button>

                    <div className="relative flex-1 w-full">
                      <input
                        type="url"
                        value={editCandPhoto.startsWith('data:') ? '' : editCandPhoto}
                        onChange={(e) => setEditCandPhoto(e.target.value)}
                        placeholder={editCandPhoto.startsWith('data:') ? 'Photo attached (<25KB compressed)' : 'Or paste direct image URL'}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-xs font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                      />
                    </div>
                  </div>

                  {editCandPhoto && (
                    <div className="flex items-center gap-3 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl w-fit">
                      <img
                        src={editCandPhoto}
                        alt="Preview"
                        className="w-12 h-14 rounded-xl object-cover border border-emerald-300 shadow-2xs"
                      />
                      <div className="text-[11px] text-emerald-900">
                        <p className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Photo Attached
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditCandPhoto('');
                            if (editFileInputRef.current) editFileInputRef.current.value = '';
                          }}
                          className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 mt-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manifesto */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-outfit font-bold text-stone-700 mb-1.5">
                    Candidate Manifesto / Vision Statement
                  </label>
                  <textarea
                    value={editCandManifesto}
                    onChange={(e) => setEditCandManifesto(e.target.value)}
                    rows={3}
                    placeholder="Brief statement outlining candidate vision, initiatives, and goals..."
                    className="w-full px-4 py-3 rounded-xl border border-[#EAE3D9] bg-[#FAF7F2]/50 text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-[#C59048]/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE3D9]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-outfit font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditCandidate}
                  className="px-7 py-2.5 rounded-full bg-[#581c38] hover:bg-[#431229] text-white text-xs font-outfit font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingEditCandidate ? 'Saving Changes...' : 'Update Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
