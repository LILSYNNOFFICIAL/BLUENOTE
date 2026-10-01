import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ShieldCheck, Network, Cpu, ArrowRight, RotateCcw } from 'lucide-react';
import { BlueNoteLogo } from './BlueNoteLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

interface MagicParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  twinkleSpeed: number;
  phase: number;
  isStar: boolean;
}

const BOOT_STEPS = [
  { label: 'Sketching Zero-Demo Second Brain Canvas...', icon: Cpu },
  { label: 'Initializing PROJECTS (10 GB Chunked Docs & AI Sandbox)...', icon: ShieldCheck },
  { label: 'Harmonizing Knowledge Graph & Pattern Engine...', icon: Network },
  { label: 'BlueNote Clean Workspace Ready', icon: Sparkles },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(8);
  const [stepIndex, setStepIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Boot progression timer (3.1s choreographed pen & particle sequence)
  useEffect(() => {
    setProgress(10);
    setStepIndex(0);

    const t1 = setTimeout(() => {
      setProgress(40);
      setStepIndex(1);
    }, 750);
    const t2 = setTimeout(() => {
      setProgress(76);
      setStepIndex(2);
    }, 1600);
    const t3 = setTimeout(() => {
      setProgress(100);
      setStepIndex(3);
    }, 2450);
    const t4 = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 340);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete, animKey]);

  // 60fps Magic Particles + Pen Nib Emitter Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const palette = ['#38bdf8', '#0077ff', '#60a5fa', '#bae6fd', '#fbbf24', '#818cf8'];
    const particles: MagicParticle[] = [];

    // Seed ambient magic particles
    for (let i = 0; i < 85; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: -Math.random() * 0.85 - 0.2,
        size: Math.random() * 3.2 + 1.2,
        alpha: Math.random() * 0.75 + 0.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        twinkleSpeed: Math.random() * 0.06 + 0.02,
        phase: Math.random() * Math.PI * 2,
        isStar: i % 4 === 0,
      });
    }

    const startTime = performance.now();

    const drawFourPointStar = (
      c: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      outerR: number,
      color: string,
      alpha: number
    ) => {
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 12;
      c.beginPath();
      const innerR = outerR * 0.32;
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 4;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.restore();
    };

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Center coordinates around the BlueNote B emblem
      const centerX = width / 2;
      const centerY = height / 2 - 48;

      // Pen tip orbit path (glides in a figure-8 / musical flourish around the B emblem)
      const penProgress = Math.min(1, elapsed / 2.4);
      const angle = penProgress * Math.PI * 2.15 - Math.PI * 0.65;
      const orbitRx = Math.min(width * 0.28, 155);
      const orbitRy = 95;
      const penTipX = centerX + Math.cos(angle) * orbitRx * (1 - penProgress * 0.22);
      const penTipY =
        centerY + Math.sin(angle * 1.5) * orbitRy * (1 - penProgress * 0.18) - 12;

      // Emit fresh magic stardust from the pen nib while it writes
      if (penProgress < 0.98) {
        for (let s = 0; s < 2; s++) {
          particles.push({
            x: penTipX + (Math.random() - 0.5) * 8,
            y: penTipY + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 2.1,
            vy: (Math.random() - 0.65) * 2.1,
            size: Math.random() * 4.2 + 1.6,
            alpha: 0.95,
            color: palette[Math.floor(Math.random() * palette.length)],
            twinkleSpeed: 0.08,
            phase: Math.random() * Math.PI * 2,
            isStar: Math.random() > 0.45,
          });
        }
      }

      // Keep particle count bounded
      while (particles.length > 190) {
        particles.shift();
      }

      // Update & draw magic particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.twinkleSpeed;
        const currentAlpha = Math.max(
          0.08,
          Math.min(1, p.alpha * (0.65 + 0.35 * Math.sin(p.phase)))
        );

        if (p.y < -20) p.y = height + 10;
        if (p.x < -20) p.x = width + 10;
        if (p.x > width + 20) p.x = -10;

        if (p.isStar) {
          drawFourPointStar(ctx, p.x, p.y, p.size * 2.1, p.color, currentAlpha);
        } else {
          ctx.save();
          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [animKey]);

  const ActiveStepIcon = BOOT_STEPS[stepIndex]?.icon || Sparkles;

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-b from-[#f8fbff] via-[#eef6ff] to-[#e0effe] dark:from-slate-950 dark:via-[#061229] dark:to-slate-950 flex flex-col items-center justify-between p-6 sm:p-8 select-none overflow-hidden transition-opacity duration-300 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Interactive 60fps Magic Particles Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Subtle Ambient Radial Halo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-sky-400/20 dark:bg-blue-600/20 blur-3xl pointer-events-none" />

      {/* Top Controls Bar */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-xs">
        <span className="font-mono tracking-wider uppercase text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-blue-200/70 dark:border-slate-800 shadow-2xs">
          BlueNote OS • Android & Web Second Brain
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnimKey((k) => k + 1)}
            className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Replay Magic Pen & Particle Animation"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Stage: Attached BlueNote "B + Musical Note" Emblem + Animated Pen & Magic Ribbon */}
      <div
        key={animKey}
        className="relative z-10 flex flex-col items-center text-center max-w-lg my-auto"
      >
        <div className="relative flex items-center justify-center w-64 h-60">
          {/* Glowing Calligraphic Ink Ribbon Path & Magic Sparkle Ring */}
          <svg
            viewBox="0 0 320 280"
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          >
            <defs>
              <linearGradient id="magicInkRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                <stop offset="45%" stopColor="#0077ff" stopOpacity="0.85" />
                <stop offset="80%" stopColor="#fbbf24" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="penBarrelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="45%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="goldNibGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <filter id="ribbonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Luminous Magic Ink Flourish Drawn by the Pen */}
            <path
              d="M 36 218 C 12 138, 86 38, 174 48 C 258 58, 294 148, 232 204 C 194 236, 134 224, 152 172"
              fill="none"
              stroke="url(#magicInkRibbon)"
              strokeWidth="4.5"
              strokeLinecap="round"
              filter="url(#ribbonGlow)"
              strokeDasharray="620"
              strokeDashoffset="620"
              style={{
                animation: 'bluenoteDrawRibbon 2.1s cubic-bezier(0.22, 1, 0.36, 1) forwards',
              }}
            />

            {/* Floating 4-Point Magic Star Sparkles around the B Emblem */}
            {[
              { cx: 58, cy: 78, r: 9, fill: '#38bdf8', delay: '0.2s' },
              { cx: 262, cy: 68, r: 11, fill: '#fbbf24', delay: '0.5s' },
              { cx: 274, cy: 186, r: 8, fill: '#0077ff', delay: '0.8s' },
              { cx: 48, cy: 192, r: 7, fill: '#60a5fa', delay: '1.1s' },
            ].map((st, idx) => (
              <g
                key={idx}
                transform={`translate(${st.cx}, ${st.cy})`}
                style={{
                  animation: `bluenoteTwinkle 1.8s ease-in-out ${st.delay} infinite alternate`,
                }}
              >
                <path
                  d={`M 0 ${-st.r} L ${st.r * 0.28} ${-st.r * 0.28} L ${st.r} 0 L ${
                    st.r * 0.28
                  } ${st.r * 0.28} L 0 ${st.r} L ${-st.r * 0.28} ${st.r * 0.28} L ${-st.r} 0 L ${
                    -st.r * 0.28
                  } ${-st.r * 0.28} Z`}
                  fill={st.fill}
                />
              </g>
            ))}

            {/* Animated Fountain / Stylus Pen Sketching the Emblem */}
            <g
              style={{
                animation:
                  'bluenotePenChoreography 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
              }}
            >
              {/* Glowing Magic Spark at Pen Nib Tip (Origin 0,0) */}
              <circle cx="0" cy="0" r="7" fill="#fef08a" opacity="0.9" />
              <circle cx="0" cy="0" r="14" fill="#38bdf8" opacity="0.35" />

              {/* Pen angled at -42 degrees with tip at (0,0) */}
              <g transform="rotate(-42)">
                {/* Gold Fountain Nib */}
                <path
                  d="M 0 0 L 14 -6 L 22 -4 L 22 4 L 14 6 Z"
                  fill="url(#goldNibGrad)"
                />
                {/* Nib breather hole & slit */}
                <line x1="0" y1="0" x2="11" y2="0" stroke="#78350f" strokeWidth="1" />
                <circle cx="11" cy="0" r="1.4" fill="#78350f" />

                {/* Gold Collar Ring */}
                <rect x="22" y="-5.5" width="4.5" height="11" rx="1" fill="#fbbf24" />

                {/* Sapphire Blue Ergonomic Pen Barrel */}
                <path
                  d="M 26.5 -6 L 92 -7.5 C 98 -7.5, 102 -4, 102 0 C 102 4, 98 7.5, 92 7.5 L 26.5 6 Z"
                  fill="url(#penBarrelGrad)"
                />

                {/* Specular Highlight Strip on Pen Barrel */}
                <path
                  d="M 29 -3.2 L 90 -4.2"
                  stroke="#93c5fd"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeOpacity="0.7"
                />

                {/* Gold Pocket Clip */}
                <path
                  d="M 62 -7.5 L 86 -9.5 C 89 -9.5, 90 -7.5, 88 -6.5 L 62 -6 Z"
                  fill="url(#goldNibGrad)"
                />
              </g>
            </g>
          </svg>

          {/* The Attached BlueNote "B + Musical Note" 3D Folded Emblem */}
          <div
            style={{
              animation: 'bluenoteEmblemReveal 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <BlueNoteLogo size={176} animated />
          </div>
        </div>

        {/* Attached Two-Tone "BlueNote" Wordmark & Tagline */}
        <div className="space-y-2.5 -mt-1">
          <h1
            className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-none"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            <span className="text-[#071936] dark:text-white">Blue</span>
            <span className="bg-gradient-to-b from-[#2bb0ff] via-[#0077ff] to-[#0051d5] bg-clip-text text-transparent">
              Note
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium tracking-wide max-w-md mx-auto leading-relaxed">
            Remember everything. Organize anything.
            <br />
            Focus on what matters.
          </p>
        </div>

        {/* Startup Progress Bar */}
        <div className="w-full max-w-xs space-y-2 pt-6">
          <div className="w-full h-2 rounded-full bg-blue-950/10 dark:bg-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] via-[#0077ff] to-[#1d4ed8] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <ActiveStepIcon className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 animate-spin" />
              {BOOT_STEPS[stepIndex]?.label}
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-sky-400">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Store & Capabilities Strip */}
      <div className="relative z-10 w-full max-w-2xl flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        <span className="px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-800">
          ✨ 100% On-Device AI
        </span>
        <span className="px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-800">
          🤖 Google Play & F-Droid Ready
        </span>
        <span className="px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-800">
          🔥 30D Habit & Streak Analytics
        </span>
      </div>

      {/* Keyframe Animations for the Pen & Magic Ink Ribbon */}
      <style>{`
        @keyframes bluenoteDrawRibbon {
          0% {
            stroke-dashoffset: 620;
            opacity: 0.2;
          }
          65% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.85;
          }
        }
        @keyframes bluenotePenChoreography {
          0% {
            transform: translate(36px, 218px) rotate(-18deg) scale(0.92);
          }
          28% {
            transform: translate(78px, 68px) rotate(12deg) scale(1);
          }
          58% {
            transform: translate(236px, 92px) rotate(24deg) scale(1.04);
          }
          82% {
            transform: translate(162px, 186px) rotate(-8deg) scale(1);
          }
          100% {
            transform: translate(234px, 182px) rotate(6deg) scale(0.96);
          }
        }
        @keyframes bluenoteEmblemReveal {
          0% {
            transform: scale(0.82) translateY(10px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes bluenoteTwinkle {
          0% {
            transform: scale(0.65) rotate(0deg);
            opacity: 0.45;
          }
          100% {
            transform: scale(1.2) rotate(25deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
