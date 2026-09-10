'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import SMVITMLogo from '@/components/SMVITMLogo';

export default function ProfileSetup() {
  const router = useRouter();

  useEffect(() => {
    // Automatically skip profile setup and go directly to the voting dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF7F2] text-[#122147]">
      <SMVITMLogo size="lg" showText={false} className="animate-bounce mb-4" />
      <Loader2 className="w-8 h-8 animate-spin text-[#7B1436] mb-4" />
      <p className="text-xs font-bold text-[#122147]/70 uppercase tracking-widest">
        Redirecting directly to SMVITM Voting Dashboard...
      </p>
    </div>
  );
}
