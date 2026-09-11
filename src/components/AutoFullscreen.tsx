'use client';

import { useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * Programmatically request fullscreen across all browser implementations
 */
export function requestPortalFullscreen() {
  if (typeof document === 'undefined') return;
  const docEl = document.documentElement as any;
  if (
    !document.fullscreenElement &&
    !(document as any).webkitFullscreenElement &&
    !(document as any).mozFullScreenElement &&
    !(document as any).msFullscreenElement
  ) {
    const requestMethod =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.webkitRequestFullScreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestMethod) {
      try {
        const promise = requestMethod.call(docEl);
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {
            // Silently handled if browser requires active user gesture
          });
        }
      } catch {}
    }
  }
}

/**
 * Programmatically exit fullscreen across all browser implementations
 */
export function exitPortalFullscreen() {
  if (typeof document === 'undefined') return;
  const doc = document as any;
  const exitMethod =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.mozCancelFullScreen ||
    doc.msExitFullscreen;
  if (exitMethod) {
    try {
      const promise = exitMethod.call(doc);
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
    } catch {}
  }
}

export function AutoFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const checkFullscreen = useCallback(() => {
    const isFs = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setIsFullscreen(isFs);
  }, []);

  useEffect(() => {
    setMounted(true);
    checkFullscreen();

    // 1. Attempt immediately when portal opens
    requestPortalFullscreen();

    // 2. Trigger on first user interaction anywhere on screen
    const handleGesture = () => {
      requestPortalFullscreen();
    };

    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
    window.addEventListener('pointerdown', handleGesture, { passive: true });

    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('pointerdown', handleGesture);
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, [checkFullscreen]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 pointer-events-auto print:hidden">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isFullscreen) {
            exitPortalFullscreen();
          } else {
            requestPortalFullscreen();
          }
        }}
        title={isFullscreen ? "Exit Fullscreen Kiosk" : "Enter Fullscreen Kiosk"}
        className={`px-3 py-2 rounded-full text-xs font-bold font-outfit flex items-center gap-1.5 shadow-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
          isFullscreen
            ? 'bg-[#122147]/85 hover:bg-[#122147] text-white border-[#122147]/30 backdrop-blur-md opacity-35 hover:opacity-100'
            : 'bg-[#7B1436] hover:bg-[#5e0e28] text-white border-[#7B1436]/40 animate-pulse'
        }`}
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-3.5 h-3.5 text-[#C59048]" />
            <span className="hidden sm:inline text-[11px]">Fullscreen</span>
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5 text-[#C59048]" />
            <span>Full Screen</span>
          </>
        )}
      </button>
    </div>
  );
}
