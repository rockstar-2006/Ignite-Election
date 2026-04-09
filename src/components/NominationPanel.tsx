'use client';

import { useState, useEffect } from "react";
import { ELECTION_POSTS } from "@/lib/constants";
import { updateNomination } from "@/lib/db";
import { CheckSquare, Square, AlertCircle, FileText, ChevronRight, Save, Trash2, XCircle } from "lucide-react";

interface NominationPanelProps {
  semester: string;
  email: string;
  initialNominations: string[];
  disabled: boolean;
}

export default function NominationPanel({ semester, email, initialNominations, disabled }: NominationPanelProps) {
  const [draftNominations, setDraftNominations] = useState<string[]>(initialNominations);
  const [isSaved, setIsSaved] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isDifferent = JSON.stringify([...draftNominations].sort()) !== JSON.stringify([...initialNominations].sort());
    setIsSaved(!isDifferent);
  }, [draftNominations, initialNominations]);

  const posts = ELECTION_POSTS[semester as keyof typeof ELECTION_POSTS] || [];

  const handleToggle = (postId: string) => {
    if (disabled) return;
    
    let newNominations = [...draftNominations];
    if (newNominations.includes(postId)) {
      newNominations = newNominations.filter(id => id !== postId);
    } else {
      if (newNominations.length >= 3) {
        alert("Maximum Limit: You can only apply for 3 positions.");
        return;
      }
      newNominations.push(postId);
    }
    setDraftNominations(newNominations);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateNomination(email, draftNominations);
      // Wait for a second to show success
      setTimeout(() => window.location.reload(), 500);
      alert("Official Record Updated Successfully.");
    } catch (err) {
      alert("Error: Data sync failed. Check your internet.");
    } finally {
      setLoading(false);
    }
  };

  const isWithdrawing = draftNominations.length < initialNominations.length;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Nomination Dashboard</h3>
          <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-widest leading-none">
            {isSaved ? "Viewing your confirmed records" : "Reviewing pending changes"}
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-2 bg-slate-100 rounded-lg border border-slate-200">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-black text-slate-700 tracking-widest uppercase">{draftNominations.length} / 3 SUBMITTED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((post) => {
          const isSelected = draftNominations.includes(post.id);
          const isLimitReached = draftNominations.length >= 3 && !isSelected;
          const isOriginallyApplied = initialNominations.includes(post.id);
          
          return (
            <button
              key={post.id}
              onClick={() => handleToggle(post.id)}
              disabled={loading || disabled || isLimitReached}
              className={`
                group relative flex items-center justify-between p-6 rounded-xl border-2 transition-all text-left
                ${isSelected 
                  ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm overflow-hidden' 
                  : (isLimitReached || disabled) ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white hover:border-blue-400 text-slate-600 border-slate-200'}
                ${loading ? 'cursor-wait' : 'active:scale-[0.99]'}
              `}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`shrink-0 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                   {isSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                </div>
                <div>
                   <p className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{post.name}</p>
                   <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                        isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isSelected ? 'STATUS: APPLIED' : 'STATUS: NOT APPLIED'}
                      </span>
                   </div>
                </div>
              </div>

              {/* Hover Effect Text for Withdrawal */}
              {isSelected && (
                <div className="absolute inset-0 bg-red-600 text-white flex flex-col items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-200 z-20">
                   <XCircle className="w-6 h-6 mb-1" />
                   <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Tap to Withdraw</span>
                </div>
              )}

              {!isSelected && !isLimitReached && (
                <div className="opacity-0 group-hover:opacity-100 text-blue-600 font-black text-[9px] uppercase tracking-widest transition-opacity relative z-10">
                  Click to Apply
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* FINAL SUBMIT BUTTON */}
      {!disabled && !isSaved && (
        <div className="pt-6 animate-fade-in border-t border-slate-200 mt-8">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 flex items-start gap-3">
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
             <p className="text-[10px] text-amber-800 font-bold uppercase tracking-tight">
               Warning: You have changed your selection. You must click the button below to {isWithdrawing ? 'withdraw from some posts' : 'submit new applications'}.
             </p>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full h-16 rounded-xl font-bold text-base shadow-xl flex items-center justify-center gap-4 transition-all relative overflow-hidden group active:scale-95 ${
              isWithdrawing ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-900 hover:bg-blue-800'
            } text-white`}
          >
            {loading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : isWithdrawing ? (
              <>
                <Trash2 className="w-6 h-6" />
                <span>CONFIRM WITHDRAWAL & UPDATE</span>
              </>
            ) : (
              <>
                <FileText className="w-6 h-6" />
                <span>SUBMIT NEW NOMINATIONS</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

import { RefreshCw } from "lucide-react";
