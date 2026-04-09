'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/db";
import ProfileCard from "@/components/ProfileCard";
import NominationPanel from "@/components/NominationPanel";
import { ShieldCheck, LogOut, Layout, BookOpen, Info, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (user?.email) {
      if (isAdmin) {
        // Admins skip profile verification and go to their console
        console.log("User is admin, redirecting to admin panel");
        router.push("/admin");
      } else {
        console.log("Fetching user profile...");
        getUserProfile(user.email).then((data) => {
          if (!data) {
            console.log("No profile found, redirecting to profile-setup");
            router.push("/profile-setup");
          } else {
            console.log("Profile loaded successfully");
            setProfile(data);
            setLoading(false);
          }
        }).catch(err => {
          console.error("Dashboard profile fetch error:", err);
          // Still redirect on error - user can try to setup profile again
          router.push("/profile-setup");
        });
      }
    }
  }, [user, authLoading, router, isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-900" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Fetching Official Records...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Official Header */}
      <header className="bg-[#1e3a8a] text-white shadow-lg relative z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-200" />
            <h1 className="text-xl font-bold tracking-tight">Ignite Election Portal</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => router.push("/admin")}
                className="hidden md:flex items-center gap-2 px-6 py-2 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-all border border-white/20"
              >
                <ShieldCheck className="w-4 h-4" />
                ADMIN PANEL
              </button>
            )}
            <button 
              onClick={logout}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-200 rounded-lg text-xs font-bold transition-all border border-red-500/20 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left: Official ID Card */}
          <aside className="w-full lg:w-[350px] shrink-0">
             <ProfileCard user={profile} />
          </aside>
          
          {/* Right: Nomination Space */}
          <section className="flex-grow space-y-8">
            <div className="bg-white rounded-2xl shadow-academic border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center text-[#1e3a8a]">
                  <Layout className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">Election Nomination Console</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Status: Open for Semester {profile.semester}</p>
                </div>
              </div>

              <div className="p-8">
                <NominationPanel 
                  semester={profile.semester} 
                  email={profile.email} 
                  initialNominations={profile.nominations} 
                  disabled={profile.hasBacklogs}
                />
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-4">
              <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-blue-900">Official Instructions</h4>
                <p className="text-xs text-blue-800 leading-relaxed mt-1 font-medium italic">
                  Select your desired council post from the list above and click the "OFFICIALLY SUBMIT" button to record your choices. You can withdraw and re-apply anytime before the deadline.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-24 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Integrated Digital Election System • SODE-EDU TECHNOLOGY HUB</p>
        </div>
      </footer>
    </div>
  );
}
