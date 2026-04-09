'use client';

import { ELECTION_POSTS } from "@/lib/constants";
import { Users, BarChart3 } from "lucide-react";

interface AdminPostListProps {
  semester: string;
  stats: Record<string, number>;
}

export default function AdminPostList({ semester, stats }: AdminPostListProps) {
  const posts = ELECTION_POSTS[semester as keyof typeof ELECTION_POSTS] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xl font-bold text-slate-800">{semester} Semester Applicants</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] hover:bg-white hover:shadow-md transition-all group"
          >
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{post.name}</p>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black text-slate-900 leading-none">
                {stats[post.id] || 0}
              </span>
              <div className="bg-white p-2.5 rounded-2xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center gap-2">
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min((stats[post.id] || 0) * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
