'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { 
  Loader2, 
  ShieldCheck, 
  Info, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Vote, 
  Award, 
  Users, 
  Clock,
  Download
} from "lucide-react";
import SMVITMLogo from "@/components/SMVITMLogo";

function SignInContent() {
  const { user, loginWithGoogle, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [electionOpen, setElectionOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkStandalone = () => {
      const standalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: window-controls-overlay)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://') ||
         searchParams?.get('pwa') === 'true');
      if (standalone) {
        setIsStandalone(true);
      }
    };
    checkStandalone();

    fetch('/api/election-status')
      .then((res) => res.json())
      .then((data) => {
        setElectionOpen(Boolean(data.status?.votingOpen && data.status?.isPublished));
      })
      .catch(() => setElectionOpen(false));
  }, [searchParams]);

  // Handle OAuth errors from NextAuth
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'Callback': 'Authentication configuration issue. Please contact the Election Officer.',
        'OAuthSignin': 'Failed to connect with Google. Please verify your internet connection.',
        'OAuthCallback': 'OAuth callback configuration check required.',
        'OAuthCreateAccount': 'Could not initialize voter profile. Please contact Election Commission.',
        'EmailCreateAccount': 'Email account verification failed.',
        'EventError': 'Authentication system notice. Please retry.',
        'AccessDenied': 'Access restricted: Only verified @sode-edu.in institutional email addresses are eligible to vote.',
        'CredentialsSignin': 'Invalid credentials. Please use your official college account.',
      };
      setError(errorMessages[errorParam] || `Authentication notification: ${errorParam}`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (mounted && user && !authLoading) {
      router.push("/dashboard");
    } else if (mounted && !user && !authLoading && !loading) {
      const isDirect = searchParams?.get('login') === 'true' || searchParams?.get('direct') === 'true';
      const hasError = searchParams?.get('error');
      if (isDirect && !hasError) {
        handleSignIn();
      }
    }
  }, [user, authLoading, router, mounted, searchParams]);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || "Failed to sign in. Please use your @sode-edu.in account.");
      setLoading(false);
    }
  };

  const scrollToGuidelines = () => {
    const el = document.getElementById('guidelines-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // When running as an installed PWA (Standalone window) or requested directly,
  // show ONLY the clean, direct Sign-In screen with zero website/landing clutter.
  if (mounted && (isStandalone || searchParams?.get('pwa') === 'true' || searchParams?.get('direct') === 'true')) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#C59048]/20 selection:text-[#7B1436] text-[#122147]">
        <div className="max-w-md w-full bg-white border border-[#EAE3D9] rounded-3xl p-8 sm:p-10 shadow-xl text-center animate-fade-in relative overflow-hidden">
          {/* Top Institutional Color Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7B1436] via-[#C59048] to-[#122147]" />

          {/* College Logo */}
          <div className="flex justify-center mb-5 mt-2">
            <SMVITMLogo size="lg" showText={false} className="shadow-md rounded-2xl" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#A37332] text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C59048]" />
            <span>Official Election Portal</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-[#581c38] tracking-tight">
            Student Council Elections
          </h1>
          <p className="text-xs text-stone-500 font-medium mt-1">
            Shri Madhwa Vadiraja Institute of Technology &amp; Management
          </p>

          {/* Error Alert Display */}
          {error && (
            <div className="my-5 p-3.5 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-[#7B1436] text-xs font-semibold flex items-start gap-2.5 text-left shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#7B1436] mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Instruction Card */}
          <div className="my-6 p-4 bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl text-left space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#122147]">
              <Lock className="w-3.5 h-3.5 text-[#C59048]" />
              <span>Institutional Single Sign-On</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Sign in using your official <strong className="text-[#7B1436]">@sode-edu.in</strong> Google account to access your confidential election ballot.
            </p>
          </div>

          {/* Big Google Sign-In Button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-[#7B1436] hover:bg-[#5e0e28] text-white text-sm font-outfit font-bold shadow-lg shadow-[#7B1436]/25 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#C59048]" />
                <span>Connecting to Google SSO...</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                    />
                  </svg>
                </div>
                <span>Sign In with @sode-edu.in</span>
              </>
            )}
          </button>

          {/* Shared Voting Device Helper */}
          <div className="mt-4 p-3 bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl text-left text-[11px] text-stone-600 flex items-start gap-2.5 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-[#C59048] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Shared Voting Booth:</strong> When Google opens, select <strong>&ldquo;Use another account&rdquo;</strong> to sign in with your own student email and password.
            </p>
          </div>

          {/* Security Guarantee Badges */}
          <div className="mt-5 pt-4 border-t border-[#EAE3D9] flex items-center justify-center gap-3 text-[11px] text-stone-500 font-medium">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Secret Ballot
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#122147] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C59048]" />
              One Student, One Vote
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Shri Madhwa Vadiraja Institute of Technology &amp; Management • Vishwothama Nagar, Bantakal, Udupi
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-radial-warm flex flex-col justify-between font-sans selection:bg-[#C59048]/20 selection:text-[#7B1436] text-[#122147]">
      
      {/* ============================================================ */}
      {/* 1. TOP NAVIGATION BAR (AASARE-STYLE CLEAN NAVBAR)            */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EAE3D9]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          {/* Logo & College Identity */}
          <div className="flex items-center gap-3.5">
            <SMVITMLogo size="sm" showText={false} className="shadow-sm" />
            <div className="flex flex-col">
              <span className="font-outfit font-black text-sm sm:text-base text-[#7B1436] tracking-wide leading-tight uppercase">
                SMVITM E-VOTING
              </span>
              <span className="hidden sm:inline text-[9px] uppercase tracking-wider text-[#122147]/60 font-semibold truncate max-w-xs md:max-w-md">
                Shri Madhwa Vadiraja Institute of Technology &amp; Management
              </span>
            </div>
          </div>

          {/* Navigation Links & Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#122147]/70 mr-2">
              <a href="#" className="text-[#7B1436] font-bold border-b-2 border-[#7B1436] pb-0.5">Home</a>
              <button onClick={scrollToGuidelines} className="hover:text-[#7B1436] transition cursor-pointer">Guidelines</button>
              <a href="https://sode-edu.in/smvitm/" target="_blank" rel="noopener noreferrer" className="hover:text-[#7B1436] transition">About SMVITM</a>
            </nav>

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#581c38] hover:bg-[#431229] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#581c38]/20 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C59048]" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION (2-COLUMN EDITORIAL AASARE LAYOUT)           */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 flex flex-col justify-center">
        
        {/* Error Alert Display */}
        {error && (
          <div className="mb-8 p-4 bg-[#FDF2F4] border border-[#F0C4CE] rounded-2xl text-[#7B1436] text-xs sm:text-sm font-semibold flex items-start gap-3 shadow-xs animate-fade-in max-w-4xl mx-auto w-full">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#7B1436] mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Large Serif Typography & Call-To-Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#A37332] text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C59048]" />
              <span>SMVITM Student Council Elections</span>
            </div>

            {/* Main Simple, Clear Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-outfit font-bold text-[#581c38] leading-tight tracking-tight">
              Vote for your Student Council Representatives
            </h1>

            {/* Clear Subheading */}
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              Official online voting portal for <strong>Shri Madhwa Vadiraja Institute of Technology &amp; Management</strong>. Sign in using your official <strong className="text-[#122147]">@sode-edu.in</strong> college email to cast your secret vote.
            </p>

            {/* Pill Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="px-7 py-3.5 rounded-full bg-[#7B1436] hover:bg-[#5e0e28] text-white text-sm font-bold shadow-lg shadow-[#7B1436]/25 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C59048]" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Vote</span>
                    <ArrowRight className="w-4 h-4 text-white/90" />
                  </>
                )}
              </button>

              <button
                onClick={scrollToGuidelines}
                className="px-6 py-3.5 rounded-full bg-white hover:bg-stone-50 border border-[#D1D5DB] text-[#122147] text-sm font-bold shadow-xs transition-all duration-200 cursor-pointer"
              >
                Voting Rules
              </button>
            </div>

            {/* Trust Indicator Chips */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#122147]/60 pt-4 border-t border-[#EAE3D9] w-full max-w-lg">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                100% Secret Voting
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#C59048]" />
                @sode-edu.in Login
              </span>
              <span>•</span>
              <span>VTU Affiliated</span>
            </div>

          </div>

          {/* RIGHT COLUMN: Ambient Floating Preview Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-stone-200/60 border border-[#EAE3D9] relative">
              
              {/* Card Header with Real Dynamic Status */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F0EBE3]">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#8C7A6B]">
                  ELECTION STATUS
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${electionOpen ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                  <span className={`text-[11px] font-bold ${electionOpen ? 'text-emerald-800' : 'text-stone-500'}`}>
                    {electionOpen ? 'Voting Open' : 'Voting Closed'}
                  </span>
                </div>
              </div>

              {/* Contested Position List Items */}
              <div className="space-y-2.5">
                {/* Position 1 */}
                <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#FAF7F2] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center font-bold text-xs shrink-0">
                      👑
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#122147] leading-tight">
                        President &amp; Vice-President
                      </h4>
                      <p className="text-[10px] text-[#122147]/60">1 Winner Each</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${electionOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                    {electionOpen ? 'Active' : 'Closed'}
                  </span>
                </div>

                {/* Position 2 */}
                <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#FAF7F2] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center font-bold text-xs shrink-0">
                      📜
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#122147] leading-tight">
                        General Secretary
                      </h4>
                      <p className="text-[10px] text-[#122147]/60">1 Winner (Open Contest)</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${electionOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                    {electionOpen ? 'Active' : 'Closed'}
                  </span>
                </div>

                {/* Position 3 */}
                <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#FAF7F2] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center font-bold text-xs shrink-0">
                      🎭
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#122147] leading-tight">
                        Cultural Coordinator
                      </h4>
                      <p className="text-[10px] text-[#122147]/60">2 Winners (1 Boy &amp; 1 Girl)</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${electionOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                    {electionOpen ? 'Active' : 'Closed'}
                  </span>
                </div>

                {/* Position 4 */}
                <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#FAF7F2] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center font-bold text-xs shrink-0">
                      💻
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#122147] leading-tight">
                        Technical Coordinator
                      </h4>
                      <p className="text-[10px] text-[#122147]/60">2 Winners (1 Boy &amp; 1 Girl)</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${electionOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                    {electionOpen ? 'Active' : 'Closed'}
                  </span>
                </div>

                {/* Position 5 */}
                <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#FAF7F2] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center font-bold text-xs shrink-0">
                      🏅
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#122147] leading-tight">
                        Sports &amp; Promotional Coordinators
                      </h4>
                      <p className="text-[10px] text-[#122147]/60">2 Winners Each (1 Boy &amp; 1 Girl)</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${electionOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                    {electionOpen ? 'Active' : 'Closed'}
                  </span>
                </div>
              </div>

              {/* Bottom Card Action Pill */}
              <div 
                onClick={handleSignIn}
                className="mt-5 p-3.5 bg-[#FAF3E8] hover:bg-[#F5E6D3] text-[#7B1436] rounded-2xl text-xs sm:text-sm font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#E8D3B5]"
              >
                <span>Sign in with @sode-edu.in to vote</span>
                <ArrowRight className="w-4 h-4 text-[#7B1436]" />
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* ============================================================ */}
      {/* 3. THREE CORE PILLARS SECTION                                */}
      {/* ============================================================ */}
      <section id="guidelines-section" className="w-full bg-white/70 border-y border-[#EAE3D9] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-outfit font-bold text-2xl sm:text-3xl text-[#122147]">
              Simple, Fair, and Secret Student Elections
            </h2>
            <p className="text-xs sm:text-sm text-[#122147]/60 mt-2">
              The official election portal for Shri Madhwa Vadiraja Institute of Technology &amp; Management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#EAE3D9] hover:border-[#C59048]/50 transition shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center mb-5">
                <Lock className="w-6 h-6 text-[#7B1436]" />
              </div>
              <h3 className="font-bold text-base text-[#122147] mb-2">
                100% Secret Voting
              </h3>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Your vote is completely secret and private. Neither teachers, students, nor system admins can see who you voted for.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#EAE3D9] hover:border-[#C59048]/50 transition shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6 text-[#C59048]" />
              </div>
              <h3 className="font-bold text-base text-[#122147] mb-2">
                Official College Email
              </h3>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Log in securely using your verified <span className="font-mono text-[#7B1436]">@sode-edu.in</span> account. All college students are eligible to vote.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#EAE3D9] hover:border-[#C59048]/50 transition shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF3E8] border border-[#E8D3B5] text-[#7B1436] flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-[#122147]" />
              </div>
              <h3 className="font-bold text-base text-[#122147] mb-2">
                One Vote Per Student
              </h3>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Each student can submit their vote only once, ensuring fair and accurate election results.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. INSTITUTIONAL FOOTER (SINGLE LINE COLLEGE NAME)           */}
      {/* ============================================================ */}
      <footer className="w-full bg-[#FAF7F2] py-8 border-t border-[#EAE3D9] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-3">
          
          <SMVITMLogo size="sm" showText={false} className="shadow-xs mb-1" />

          {/* College Name on ONE Unified Line */}
          <h3 className="font-outfit text-sm sm:text-base md:text-lg font-black text-[#122147] tracking-tight whitespace-normal sm:whitespace-nowrap">
            Shri Madhwa Vadiraja Institute of Technology &amp; Management
          </h3>

          <p className="text-xs text-[#122147]/70 font-medium">
            Vishwothama Nagar, Bantakal, Udupi – 574115, Karnataka, India • SODE Educational Society
          </p>

          <p className="text-[11px] text-[#122147]/50 max-w-2xl">
            Accredited by NAAC with &apos;A&apos; Grade • Affiliated to VTU Belagavi • Approved by AICTE, New Delhi
          </p>

          <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
            <a href="/install" className="hover:text-[#7B1436] flex items-center gap-1 font-medium">
              <Download className="w-3.5 h-3.5 text-[#C59048]" />
              <span>Install Voting App (PWA)</span>
            </a>
            <span>•</span>
            <a href="/admin" className="hover:text-[#7B1436] font-medium">
              Admin Portal
            </a>
          </div>

          <div className="pt-1 text-[10px] text-[#A37332] font-serif-elegant italic font-semibold">
            सर्वे भद्राणि पश्यन्तु — May all see auspiciousness
          </div>

        </div>
      </footer>

    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#FAF7F2]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7B1436]" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

