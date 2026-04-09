'use client';

import { UserProfile } from "@/lib/db";
import { Mail, Phone, Calendar, UserCheck, Shield, Edit3, Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileCard({ user }: { user: UserProfile }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden animate-fade-in group w-full">
      {/* Official Header */}
      <div className="bg-[#1e3a8a] h-14 flex items-center justify-between px-6 relative overflow-hidden">
        <span className="text-white/80 font-black text-[9px] tracking-[0.2em] relative z-10 uppercase">Official Student Record</span>
        <Shield className="w-12 h-12 text-white/5 absolute -right-2 rotate-12" />
      </div>

      <div className="p-6 sm:p-8 pt-0 flex flex-col items-center -mt-8">
        <div className="relative">
          <img 
            src={user.photoURL} 
            alt={user.firstName} 
            className="w-28 sm:w-32 h-36 sm:h-44 object-cover rounded-2xl shadow-xl ring-4 ring-white"
          />
          <button 
            onClick={() => router.push("/profile-setup")}
            className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg shadow-lg"
          >
             <Edit3 className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{user.firstName} {user.lastName}</h2>
          <div className="mt-2 text-[10px] font-black text-blue-800 uppercase tracking-widest bg-blue-50 py-1 px-4 rounded-full inline-block">
            {user.semester} Semester
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-8 space-y-3">
        <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
           <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-2">
             <Fingerprint className="w-3 h-3" /> USN Number
           </span>
           <span className="text-sm font-black text-slate-700 uppercase">{user.usn || "NOT SET"}</span>
        </div>

        <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
           <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Contact Phone</span>
           <span className="text-sm font-black text-slate-700">{user.phone}</span>
        </div>

        <div className="flex flex-col gap-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
           <span className="text-[9px] font-black text-emerald-600 tracking-widest uppercase">Profile Status</span>
           <span className="text-xs font-black text-emerald-700 flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
             Active & Eligible
           </span>
        </div>
      </div>
    </div>
  );
}
