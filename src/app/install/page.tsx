'use client';

import { useState, useEffect } from 'react';
import SMVITMLogo from '@/components/SMVITMLogo';
import {
  Download,
  Smartphone,
  Laptop,
  Tablet,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Info
} from 'lucide-react';

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'desktop' | 'ios'>('android');

  useEffect(() => {
    // Check if running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsInstalled(true);
    }

    // Auto-detect OS for tab default
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setActiveTab('ios');
    } else if (/android/.test(userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install, open your browser menu (three dots ⋮ or Share icon) and select "Add to Home screen" or "Install App".');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '/auth/signin?pwa=true';
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#122147] selection:bg-[#C59048]/20 selection:text-[#7B1436] font-outfit">
      {/* Institutional Top Navbar */}
      <header className="bg-white border-b border-[#EAE3D9] sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <SMVITMLogo size="sm" showText={true} />
          <a
            href="/auth/signin?pwa=true"
            className="px-4 py-2 bg-[#7B1436] hover:bg-[#5e0e28] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Open Web Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Hero Card */}
        <div className="bg-white border-2 border-[#C59048]/30 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-[#122147]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7B1436] via-[#C59048] to-[#122147]" />

          <div className="w-20 h-20 bg-[#FAF3E8] border-2 border-[#C59048] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Download className="w-10 h-10 text-[#7B1436]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF3E8] border border-[#E8D3B5] text-[#A37332] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C59048]" />
            <span>Progressive Web App (PWA)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-[#122147] tracking-tight">
            Install SMVITM Voting App
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto mt-2.5 leading-relaxed">
            Install the official student council voting portal on shared voting tablets, laptops, or personal devices. Fast, secure, and runs in full-screen standalone mode.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            {isInstalled ? (
              <div className="w-full py-3.5 px-6 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>App Already Installed on this Device</span>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-[#7B1436] hover:bg-[#5e0e28] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#7B1436]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4 text-[#C59048]" />
                <span>Install App Now</span>
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-[#FAF7F2] hover:bg-[#FAF3E8] text-[#122147] border border-[#EAE3D9] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>Copy Direct Link</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-stone-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>No App Store needed • Works on Android, Windows, Mac &amp; iOS</span>
          </div>
        </div>

        {/* Step-by-Step Installation Guides */}
        <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#122147] text-center mb-6">
            Installation Instructions by Device
          </h2>

          {/* Device Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-[#FAF7F2] border border-[#EAE3D9] rounded-2xl gap-1">
              <button
                onClick={() => setActiveTab('android')}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-[#122147] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-[#C59048]" />
                <span>Android &amp; Tablet</span>
              </button>

              <button
                onClick={() => setActiveTab('desktop')}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'desktop'
                    ? 'bg-[#122147] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-[#C59048]" />
                <span>Laptop &amp; PC</span>
              </button>

              <button
                onClick={() => setActiveTab('ios')}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-[#122147] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Tablet className="w-3.5 h-3.5 text-[#C59048]" />
                <span>iPhone &amp; iPad</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Android & Tablet */}
          {activeTab === 'android' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-xs font-bold text-[#122147]">Open in Chrome</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Open <strong>Chrome</strong> on your Android tablet or phone and visit the voting portal.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-xs font-bold text-[#122147]">Tap Install or Menu</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Click the <strong>"Install App Now"</strong> button above, or tap Chrome menu (<strong>⋮</strong>) and choose <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-xs font-bold text-[#122147]">Launch from Home Screen</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  The <strong>SMVITM Voting</strong> icon appears on your home screen or app drawer. Tap it to run in full-screen kiosk mode!
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Laptop & PC */}
          {activeTab === 'desktop' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-xs font-bold text-[#122147]">Use Chrome or Edge</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Open this link in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on Windows, Mac, or Linux.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-xs font-bold text-[#122147]">Click the Install Icon</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Look at the right side of the address bar for the <strong>Install App icon (⊕ or computer icon)</strong> and click <strong>Install</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-xs font-bold text-[#122147]">Dedicated Window</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  The app opens as a standalone desktop window without browser tabs or address bar distractions.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: iPhone & iPad */}
          {activeTab === 'ios' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-xs font-bold text-[#122147]">Open in Safari</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Apple iOS requires PWAs to be installed from the native <strong>Safari</strong> browser.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-xs font-bold text-[#122147]">Tap Share Icon</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Tap the <strong>Share button</strong> (square with arrow pointing up) at the bottom or top of Safari.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D9] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#7B1436] text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-xs font-bold text-[#122147]">Add to Home Screen</h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Scroll down and select <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong> in the top right.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Benefits Card */}
        <div className="bg-[#FAF7F2] border border-[#EAE3D9] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7B1436] uppercase tracking-wider">
            <Info className="w-4 h-4 text-[#C59048]" />
            <span>Why Install as a PWA?</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#122147]">Kiosk Mode:</strong>
                <p className="text-stone-600 text-[11px] mt-0.5">Runs in clean full screen with no URL bar, preventing students from navigating away.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#122147]">High Performance:</strong>
                <p className="text-stone-600 text-[11px] mt-0.5">Assets are cached locally so ballots load instantly even on low network speeds.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#122147]">Fast Voter Rotation:</strong>
                <p className="text-stone-600 text-[11px] mt-0.5">Automated 10s logout returns directly to the institutional sign-in screen for the next voter.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#122147]">Zero Installation Bloat:</strong>
                <p className="text-stone-600 text-[11px] mt-0.5">Takes less than 1MB of storage compared to multi-hundred megabyte app store apps.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full bg-[#FAF7F2] border-t border-[#EAE3D9] py-8 text-center text-xs text-stone-600 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <SMVITMLogo size="sm" showText={true} lightText={false} />
          <div className="text-center md:text-right space-y-0.5">
            <p className="font-semibold text-[#122147]">
              Shri Madhwa Vadiraja Institute of Technology &amp; Management
            </p>
            <p className="text-[11px] text-stone-500">
              Vishwothama Nagar, Bantakal – 574115, Udupi Dist., Karnataka
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
