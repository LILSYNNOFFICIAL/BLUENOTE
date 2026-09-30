import React from 'react';

interface BlueNoteLogoProps {
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
  animated?: boolean;
  className?: string;
  wordmarkSize?: 'sm' | 'md' | 'lg' | 'xl';
  darkText?: boolean;
}

/**
 * Official BlueNote Brand Emblem & Wordmark based on the attached artwork:
 * - Layered 3D-shaded gradient Blue "B" with diagonal page-fold crease
 * - Crisp white eighth-note (musical note) cutout integrated into the left stem
 * - Two-tone "BlueNote" wordmark + "Remember everything. Organize anything. Focus on what matters."
 */
export const BlueNoteLogo: React.FC<BlueNoteLogoProps> = ({
  size = 44,
  showWordmark = false,
  showTagline = false,
  animated = false,
  className = '',
  wordmarkSize = 'md',
  darkText = false,
}) => {
  const uid = React.useId().replace(/:/g, '');

  const textSizeClass =
    wordmarkSize === 'xl'
      ? 'text-4xl sm:text-5xl'
      : wordmarkSize === 'lg'
      ? 'text-2xl sm:text-3xl'
      : wordmarkSize === 'sm'
      ? 'text-base'
      : 'text-lg';

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="inline-flex items-center gap-3">
        <svg
          width={size}
          height={size}
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 select-none ${
            animated ? 'drop-shadow-[0_14px_28px_rgba(37,99,235,0.42)]' : ''
          }`}
        >
          <defs>
            <linearGradient id={`bBody-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4cc9f0" />
              <stop offset="35%" stopColor="#0077ff" />
              <stop offset="75%" stopColor="#0050d5" />
              <stop offset="100%" stopColor="#003399" />
            </linearGradient>

            <linearGradient id={`bFoldUpper-${uid}`} x1="0%" y1="0%" x2="90%" y2="80%">
              <stop offset="0%" stopColor="#90e0ef" />
              <stop offset="35%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0066eb" />
            </linearGradient>

            <linearGradient id={`bInnerFold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0062ff" />
              <stop offset="100%" stopColor="#002984" />
            </linearGradient>

            <filter id={`noteShadow-${uid}`} x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="9"
                floodColor="#001d5c"
                floodOpacity="0.35"
              />
            </filter>
          </defs>

          <g transform="translate(18, 6)">
            {/* Base "B" Silhouette */}
            <path
              d="M 110 72
                 C 110 54, 124 44, 144 44
                 L 256 44
                 C 332 44, 382 86, 382 148
                 C 382 192, 354 226, 312 240
                 C 366 254, 400 294, 400 348
                 C 400 416, 344 456, 260 456
                 L 144 456
                 C 124 456, 110 442, 110 422
                 Z"
              fill={`url(#bBody-${uid})`}
            />

            {/* Left Page-Fold Facet */}
            <path
              d="M 110 72
                 C 110 54, 120 46, 134 46
                 L 254 126
                 L 254 344
                 L 124 446
                 C 114 440, 110 432, 110 422
                 Z"
              fill={`url(#bInnerFold-${uid})`}
            />

            {/* Top-Right Upper Loop Page-Crease Wing */}
            <path
              d="M 130 44
                 L 256 44
                 C 332 44, 382 86, 382 148
                 C 382 192, 354 226, 312 240
                 L 252 240
                 L 252 124
                 Z"
              fill={`url(#bFoldUpper-${uid})`}
            />

            {/* Horizontal Middle Loop Seam Shadow */}
            <path
              d="M 252 240 L 312 240"
              stroke="#002b80"
              strokeWidth="4"
              strokeOpacity="0.35"
            />

            {/* Crisp White Musical Eighth-Note Cutout */}
            <path
              d="M 240 116
                 C 258 126, 274 138, 274 156
                 L 274 342
                 C 274 388, 236 424, 192 424
                 C 156 424, 132 398, 132 364
                 C 132 324, 168 292, 212 292
                 C 223 292, 232 294, 240 298
                 Z"
              fill="#ffffff"
              filter={`url(#noteShadow-${uid})`}
            />
          </g>
        </svg>

        {showWordmark && (
          <span
            className={`font-extrabold tracking-tight leading-none select-none ${textSizeClass}`}
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            <span className={darkText ? 'text-[#071936] dark:text-white' : 'text-white'}>
              Blue
            </span>
            <span className="bg-gradient-to-b from-[#2bb0ff] via-[#0077ff] to-[#0051d5] bg-clip-text text-transparent">
              Note
            </span>
          </span>
        )}
      </div>

      {showTagline && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center font-medium leading-relaxed mt-2">
          Remember everything. Organize anything.
          <br />
          Focus on what matters.
        </p>
      )}
    </div>
  );
};
