'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // ADMIN FAST-PASS: Send admins directly to control center
        if (isAdmin) {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/auth/signin");
      }
    }
  }, [user, loading, isAdmin, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Loader2 className="w-10 h-10 animate-spin text-blue-900" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
          Authenticating Identity...
        </p>
      </div>
    </div>
  );
}
