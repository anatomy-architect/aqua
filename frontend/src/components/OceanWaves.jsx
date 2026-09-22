import React from 'react';

export default function OceanWaves({ height = 120, opacity = 0.6, className = '' }) {
  return (
    <div className={`relative w-full overflow-hidden pointer-events-none ${className}`} style={{ height: `${height}px` }}>
      <svg
        className="absolute bottom-0 w-[200%] h-full transform transition-transform"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        style={{
          animation: 'waveMotion 18s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite',
          opacity: opacity
        }}
      >
        <defs>
          <linearGradient id="oceanWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#00B0FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,120 L0,120 Z"
          fill="url(#oceanWaveGrad1)"
        />
      </svg>

      <svg
        className="absolute bottom-0 w-[200%] h-full transform transition-transform"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        style={{
          animation: 'waveMotion 12s cubic-bezier(0.36, 0.45, 0.63, 0.53) -4s infinite',
          opacity: opacity * 0.75
        }}
      >
        <defs>
          <linearGradient id="oceanWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0D1B4B" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0A0F2C" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M0,30 C300,110 450,10 600,60 C750,110 1050,20 1200,50 L1200,120 L0,120 Z"
          fill="url(#oceanWaveGrad2)"
        />
      </svg>
    </div>
  );
}
