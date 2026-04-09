'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { Loader2, ShieldCheck, Info, AlertCircle } from "lucide-react";

function SignInContent() {
  const { user, loginWithGoogle, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle OAuth errors from NextAuth
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'Callback': 'OAuth configuration error. Please check if the redirect URI is registered in Google Console.',
        'OAuthSignin': 'Failed to sign in with Google. Please check your internet connection.',
        'OAuthCallback': 'Invalid OAuth callback. This usually means the redirect URL doesn\'t match Google Console configuration.',
        'OAuthCreateAccount': 'Could not create your account. Please contact support.',
        'EmailCreateAccount': 'Email account creation failed. Please try again.',
        'Callback': 'Callback error during authentication. Please try again.',
        'EventError': 'An error occurred during authentication.',
        'AccessDenied': 'Access was denied. Only @sode-edu.in email addresses are allowed.',
        'CredentialsSignin': 'Invalid credentials. Please try again.',
      };
      setError(errorMessages[errorParam] || `Authentication error: ${errorParam}`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (mounted && user && !authLoading) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router, mounted]);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="max-w-[440px] w-full">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 bg-[#1e3a8a] rounded-2xl flex items-center justify-center text-white shadow-lg mb-6">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ignite Election</h1>
          <p className="text-slate-500 mt-2 font-medium">Digital Election Management System</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Login</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Institutional Authentication</p>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs flex gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div>Sign in using your @sode-edu.in email address</div>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full h-14 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-4 shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
