'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import SMVITMLogo from "@/components/SMVITMLogo";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Send authenticated students directly to voting dashboard
        router.push("/dashboard");
      } else {
        router.push("/auth/signin");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF7F2] text-[#122147]">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <SMVITMLogo size="lg" showText={false} className="animate-bounce" />
        <Loader2 className="w-8 h-8 animate-spin text-[#7B1436]" />
        <p className="text-[#122147]/70 font-bold text-xs uppercase tracking-widest">
          Authenticating Identity with SMVITM SSO...
        </p>
      </div>
    </div>
  );
}
