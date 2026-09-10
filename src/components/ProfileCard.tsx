'use client';

import { UserProfile } from "@/lib/db";
import { Mail, Phone, Calendar, UserCheck, Shield, Fingerprint } from "lucide-react";

export default function ProfileCard({ user }: { user: UserProfile }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden animate-fade-in group w-full">
      {/* Official Header */}
      <div className="bg-[#1e3a8a] h-14 flex items-center justify-between px-6 relative overflow-hidden">
        <span className="text-white/80 font-black text-[9px] tracking-[0.2em] relative z-10 uppercase">
          Official Voter Record
        </span>
        <Shield className="w-12 h-12 text-white/5 absolute -right-2 rotate-12" />
      </div>

      <div className="p-6 sm:p-8 pt-0 flex flex-col items-center -mt-8">
        <div className="relative">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.firstName} 
              className="w-28 sm:w-32 h-36 sm:h-44 object-cover rounded-2xl shadow-xl ring-4 ring-white"
            />
          ) : (
            <div className="w-28 sm:w-32 h-36 sm:h-44 bg-gradient-to-br from-blue-900 to-indigo-800 text-white rounded-2xl shadow-xl ring-4 ring-white flex items-center justify-center text-4xl font-black">
              {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {user.firstName} {user.lastName}
          </h2>
          <div className="mt-2 text-[10px] font-black text-blue-800 uppercase tracking-widest bg-blue-50 py-1 px-4 rounded-full inline-block border border-blue-200">
            {user.semester} Semester Voter
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-8 space-y-3">
        <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-2">
            <Fingerprint className="w-3 h-3 text-blue-600" /> Student USN
          </span>
          <span className="text-xs font-bold text-slate-700 tracking-wider font-mono">
            {user.usn || 'REGISTERED'}
          </span>
        </div>

        <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-2">
            <Mail className="w-3 h-3 text-blue-600" /> Authorized Email
          </span>
          <span className="text-xs font-bold text-slate-700 break-all">
            {user.email}
          </span>
        </div>

        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">
              Voting Eligibility
            </span>
          </div>
          <span className="text-[10px] font-black text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded-full">
            Verified
          </span>
        </div>
      </div>
    </div>
  );
}
