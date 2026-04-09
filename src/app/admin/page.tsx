'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllCandidates, UserProfile } from "@/lib/db";
import { ELECTION_POSTS } from "@/lib/constants";
import { ShieldCheck, LogOut, Layout, RefreshCcw, User, Mail, Award, Search, Phone, Fingerprint, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const { user, isAdmin, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'6th' | '4th'>('6th');
  const [filterPost, setFilterPost] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        router.push("/");
      } else {
        fetchData();
      }
    }
  }, [user, isAdmin, authLoading, router]);

  // Reset post filter when semester changes
  useEffect(() => {
    setFilterPost('all');
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllCandidates();
      setCandidates(data);
    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSemester = c.semester === activeTab;
    const matchesSearch = (c.firstName + " " + c.lastName + c.usn + c.email).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPost = filterPost === 'all' || (c.nominations && c.nominations.includes(filterPost));
    
    return matchesSemester && matchesSearch && matchesPost;
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <RefreshCcw className="w-10 h-10 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans pb-20">
      {/* Top Header - Very Simple */}
      <header className="bg-slate-900 text-white shadow-xl relative z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-black uppercase tracking-widest hidden sm:block">Ignite Admin Control</h1>
            <h1 className="text-lg font-black uppercase tracking-tight sm:hidden">Ignite Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-3 py-2 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase transition-all"
            >
              PORTAL VIEW
            </button>
            <button 
              onClick={logout}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase transition-all"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Simple Control Bar */}
        <div className="mb-8 space-y-6">
           <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">Review Nominations</h2>
              <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-2">
                {filteredCandidates.length} Applications found for {activeTab} Semester
                {filterPost !== 'all' && ` • ${ELECTION_POSTS[activeTab].find(p => p.id === filterPost)?.name}`}
              </p>
           </div>

           <div className="flex flex-col lg:flex-row gap-4">
              {/* Simple Tabs */}
              <div className="flex bg-slate-200/50 p-1.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('6th')}
                  className={`flex-1 sm:flex-none px-6 sm:px-10 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    activeTab === '6th' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  6th Semester
                </button>
                <button
                  onClick={() => setActiveTab('4th')}
                  className={`flex-1 sm:flex-none px-6 sm:px-10 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    activeTab === '4th' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  4th Semester
                </button>
              </div>

              {/* Simple Search */}
              <div className="relative flex-grow">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                  type="text" 
                  placeholder="Search Name or USN..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold"
                 />
              </div>

              {/* Post Filter Dropdown */}
              <select 
                value={filterPost}
                onChange={(e) => setFilterPost(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold uppercase text-[10px] text-slate-900 outline-none cursor-pointer"
              >
                <option value="all">All Posts</option>
                {ELECTION_POSTS[activeTab].map((post) => (
                  <option key={post.id} value={post.id}>{post.name}</option>
                ))}
              </select>

              <button 
                onClick={fetchData}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest"
              >
                Refresh List
              </button>
           </div>
        </div>

        {/* Candidate List - Left Image & Right Details */}
        <div className="space-y-6">
           {filteredCandidates.map((candidate) => (
             <div key={candidate.email} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                
                {/* Left Side: Professional Photo Section */}
                <div className="w-full md:w-[280px] bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center justify-center shrink-0">
                   <div className="relative group">
                      <img 
                        src={candidate.photoURL} 
                        alt={candidate.firstName} 
                        className="w-32 h-44 object-cover rounded-xl shadow-lg ring-4 ring-white"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-lg">
                         Verified
                      </div>
                   </div>
                   <h4 className="mt-6 text-xl font-black text-slate-900 uppercase text-center leading-tight tracking-tight">
                    {candidate.firstName}<br />{candidate.lastName}
                   </h4>
                   <span className="mt-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {candidate.semester} Semester
                   </span>
                </div>

                {/* Right Side: Detailed Table Info */}
                <div className="flex-grow">
                   {/* Details Grid */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-b border-slate-100 font-sans">
                      <div className="p-6 sm:p-8 space-y-1 sm:border-r border-slate-100">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <Fingerprint className="w-3 h-3" /> USN Number
                         </p>
                         <p className="text-sm font-black text-slate-800 uppercase tracking-wide">{candidate.usn || "N/A"}</p>
                      </div>
                      <div className="p-6 sm:p-8 space-y-1 lg:border-r border-slate-100">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <Phone className="w-3 h-3" /> Contact Phone
                         </p>
                         <p className="text-sm font-black text-slate-800 tracking-wide">{candidate.phone}</p>
                      </div>
                      <div className="p-6 sm:p-8 space-y-1 bg-emerald-50/30">
                         <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                           <ShieldCheck className="w-3 h-3" /> Backlog Check
                         </p>
                         <p className="text-xs font-black text-emerald-700 uppercase">NO ACTIVE BACKLOGS</p>
                      </div>
                   </div>

                   {/* Applied Positions Bar */}
                   <div className="p-8">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="w-1.5 h-4 bg-blue-900 rounded-full"></div>
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Positions Selected ({candidate.nominations.length}/3)</h5>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {candidate.nominations.map((pos) => (
                            <span key={pos} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                               {pos}
                            </span>
                         ))}
                         {candidate.nominations.length === 0 && (
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] italic mt-2">No selections recorded</span>
                         )}
                      </div>
                   </div>
                </div>

             </div>
           ))}

           {filteredCandidates.length === 0 && (
             <div className="bg-white rounded-3xl p-20 text-center border-4 border-dashed border-slate-200">
               <p className="text-slate-400 font-black text-xl uppercase tracking-widest italic">No Applications Found</p>
             </div>
           )}
        </div>
      </main>

      <footer className="mt-20 py-10 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 font-black tracking-[0.3em] uppercase opacity-50">Ignite Election Platform • All Records Synchronized</p>
      </footer>
    </div>
  );
}
