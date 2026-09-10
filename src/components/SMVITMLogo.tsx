'use client';

import React, { useState } from 'react';

interface SMVITMLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showText?: boolean;
  lightText?: boolean;
  className?: string;
}

export default function SMVITMLogo({
  size = 'md',
  showText = true,
  lightText = false,
  className = '',
}: SMVITMLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Dimension variants (Prominent, High-Legibility)
  const dimensions = {
    sm: { box: 'w-12 h-12', img: 'h-9 w-auto', textSize: 'text-lg sm:text-xl', subSize: 'text-xs sm:text-[13px]' },
    md: { box: 'w-14 h-14', img: 'h-11 w-auto', textSize: 'text-xl sm:text-2xl', subSize: 'text-xs sm:text-sm' },
    lg: { box: 'w-20 h-20', img: 'h-16 w-auto', textSize: 'text-2xl sm:text-3xl', subSize: 'text-sm sm:text-base' },
    hero: { box: 'w-28 h-28 sm:w-32 sm:h-32', img: 'h-22 sm:h-26 w-auto', textSize: 'text-3xl sm:text-4xl', subSize: 'text-base sm:text-lg' },
  }[size];

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Curved SMVITM Emblem Container */}
      <div
        className={`${dimensions.box} rounded-2xl sm:rounded-3xl bg-white border-2 border-[#C59048]/50 flex items-center justify-center p-1.5 shadow-md shadow-[#122147]/10 shrink-0 overflow-hidden relative group transition-transform duration-300 hover:scale-105`}
        title="SMVITM - Shri Madhwa Vadiraja Institute of Technology & Management"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF3E8]/50 to-white pointer-events-none" />

        {/* Original College Logo Image */}
        {!imageError ? (
          <img
            src="/api/logo"
            alt="SMVITM Official Logo"
            className={`${dimensions.img} object-contain relative z-10`}
            onError={() => setImageError(true)}
          />
        ) : (
          /* High-Precision Vector Fallback */
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full relative z-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="50" r="46" stroke="#C59048" strokeWidth="2.5" strokeDasharray="4 2" />
            <circle cx="50" cy="20" r="6" fill="#C59048" />
            <circle cx="50" cy="20" r="3.5" fill="#7B1436" />
            <path d="M50 30 C45 42 43 55 50 64 C57 55 55 42 50 30 Z" fill="#7B1436" />
            <path d="M50 38 C38 45 35 58 44 65 C48 57 49 48 50 38 Z" stroke="#7B1436" strokeWidth="2" fill="none" />
            <path d="M50 38 C62 45 65 58 56 65 C52 57 51 48 50 38 Z" stroke="#7B1436" strokeWidth="2" fill="none" />
            <text x="50" y="94" textAnchor="middle" fill="#7B1436" fontSize="13" fontWeight="900" fontFamily="sans-serif">
              SMVITM
            </text>
          </svg>
        )}
      </div>

      {/* Institutional Typography */}
      {showText && (
        <div className="flex flex-col leading-tight text-left">
          <div className="flex items-center gap-2.5">
            <span
              className={`font-outfit font-black tracking-tight ${dimensions.textSize} ${
                lightText ? 'text-white' : 'text-[#7B1436]'
              }`}
            >
              SMVITM
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-[#FAF3E8] text-[#A37332] border border-[#E8D3B5] shadow-2xs">
              E-Voting
            </span>
          </div>
          <span
            className={`font-outfit font-semibold tracking-tight whitespace-nowrap ${dimensions.subSize} ${
              lightText ? 'text-[#C59048]' : 'text-stone-700'
            }`}
          >
            Shri Madhwa Vadiraja Institute of Technology &amp; Management
          </span>
        </div>
      )}
    </div>
  );
}
