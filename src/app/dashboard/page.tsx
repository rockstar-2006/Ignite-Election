'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/db";
import { parseSemesterFromEmail } from "@/lib/constants";
import VotingBooth from "@/components/VotingBooth";
import SMVITMLogo from "@/components/SMVITMLogo";
import { 
  Loader2, 
  LogOut, 
  Mail, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck
} from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (user?.email) {
      getUserProfile(user.email)
        .then((data) => {
          if (!data) {
            const sem = parseSemesterFromEmail(user.email) || 'College-Wide';
            const nameParts = (user.name || '').trim().split(' ');
            const firstName = nameParts[0] || 'Student';
            const lastName = nameParts.slice(1).join(' ') || 'Voter';

            const autoProfile: UserProfile = {
              uid: user.email,
              email: user.email,
              firstName,
              lastName,
              usn: user.email.split('@')[0].toUpperCase(),
              branch: 'Engineering',
              semester: sem,
              photoURL: '',
              hasBacklogs: false,
              nominations: [],
              createdAt: new Date(),
            };

            fetch('/api/profile/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(autoProfile),
            })
              .then(() => setProfile(autoProfile))
              .catch(() => setProfile(autoProfile))
              .finally(() => setLoading(false));

            return;
          }
          setProfile(data);
          setLoading(false);
        })
        .catch(() => {
          const sem = parseSemesterFromEmail(user.email) || 'College-Wide';
          const nameParts = (user.name || '').trim().split(' ');
          const autoProfile: UserProfile = {
            uid: user.email,
            email: user.email,
            firstName: nameParts[0] || 'Student',
            lastName: nameParts.slice(1).join(' ') || 'Voter',
            usn: user.email.split('@')[0].toUpperCase(),
            branch: 'Engineering',
            semester: sem,
            photoURL: '',
            hasBacklogs: false,
            nominations: [],
            createdAt: new Date(),
          };
          setProfile(autoProfile);
          setLoading(false);
        });
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF7F2] text-[#122147]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <SMVITMLogo size="lg" showText={false} className="animate-bounce" />
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1436]" />
          <p className="text-xs font-bold text-[#122147]/70 uppercase tracking-widest">
            Loading Election Portal...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || user?.name || 'Student Voter';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#122147] font-sans flex flex-col justify-between selection:bg-[#C59048]/20 selection:text-[#7B1436]">
      <div>
        {/* ============================================================ */}
        {/* 1. CLEAN AASARE-STYLE WARM IVORY/WHITE NAVBAR (NO BLUE!)     */}
        {/* ============================================================ */}
        <header className="bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE3D9]/80 sticky top-0 z-50 shadow-xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <SMVITMLogo size="sm" showText={true} lightText={false} />
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={logout}
                className="px-4 py-2 rounded-full bg-[#7B1436]/10 hover:bg-[#7B1436] text-[#7B1436] hover:text-white border border-[#7B1436]/25 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2. FLOATING MODERN VOTER PROFILE CARD                        */}
        {/* ============================================================ */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-7 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              
              {/* Left: Student Identity */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF3E8] text-[#7B1436] border border-[#E8D3B5] flex items-center justify-center font-outfit font-bold text-2xl shrink-0 shadow-2xs">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg sm:text-xl font-outfit font-bold text-[#122147] tracking-tight">
                      {fullName}
                    </h2>
                    <span className="px-3 py-0.5 bg-[#FAF3E8] text-[#A37332] text-xs font-semibold rounded-full border border-[#E8D3B5]">
                      Student Elector
                    </span>
                    <span className="px-3 py-0.5 bg-stone-100 text-stone-700 text-xs font-medium rounded-full border border-stone-200">
                      {profile.branch || 'Engineering'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-normal">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#C59048]" />
                      <span className="font-medium text-[#122147]">{profile.email}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Verified Voter Eligibility Badge */}
              <div className="flex items-center gap-3 self-start md:self-auto bg-emerald-50 text-emerald-900 px-4 py-3 rounded-2xl border border-emerald-200/80 shrink-0 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-emerald-950 leading-tight">
                    Verified Voter
                  </p>
                  <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                    Eligible to vote in student elections
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. VOTING BOOTH SECTION                                      */}
        {/* ============================================================ */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">
          <VotingBooth 
            semester={profile.semester} 
            email={profile.email} 
            onVoteSuccess={logout}
          />
        </main>
      </div>

      {/* ============================================================ */}
      {/* 4. CLEAN WARM INSTITUTIONAL FOOTER                           */}
      {/* ============================================================ */}
      <footer className="w-full bg-[#FAF7F2] border-t border-[#EAE3D9] py-8 text-center text-xs text-stone-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <SMVITMLogo size="sm" showText={true} lightText={false} />

          <div className="text-center md:text-right space-y-0.5">
            <p className="font-semibold text-[#122147] whitespace-nowrap">
              Shri Madhwa Vadiraja Institute of Technology &amp; Management
            </p>
            <p className="text-[11px] text-stone-500">
              Vishwothama Nagar, Bantakal – 574115, Udupi Dist., Karnataka • Affiliated to VTU Belagavi
            </p>
            <p className="text-[10px] text-[#A37332] font-serif italic">
              सर्वे भद्राणि पश्यन्तु — May all see auspiciousness
            </p>
            <p className="text-[11px] font-semibold text-[#7B1436] pt-1">
              Powered by Edmin
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
