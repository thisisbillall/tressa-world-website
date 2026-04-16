'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

type NavMode = 'enter' | 'leave';

type Ctx = { navigate: (href: string, mode?: NavMode) => void; isTransitioning: boolean };
const TransitionCtx = createContext<Ctx>({ navigate: () => { }, isTransitioning: false });

export const useTressaNav = () => useContext(TransitionCtx);

type Phase = 'idle' | 'closing' | 'holding' | 'opening';

export default function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<NavMode>('enter');

  const navigate = useCallback(
    async (href: string, m: NavMode = 'enter') => {
      if (phase !== 'idle') return;
      setMode(m);
      setPhase('closing');
      await wait(700);          // doors close in
      setPhase('holding');
      router.push(href);         // navigate behind the closed doors
      await wait(500);           // hold + mount new page
      setPhase('opening');
      await wait(900);           // doors open out
      setPhase('idle');
    },
    [phase, router]
  );

  const isTransitioning = phase !== 'idle';

  return (
    <TransitionCtx.Provider value={{ navigate, isTransitioning }}>
      {children}
      <AnimatePresence>
        {phase !== 'idle' && <DoorOverlay key="doors" phase={phase} mode={mode} />}
      </AnimatePresence>
    </TransitionCtx.Provider>
  );
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/* -------------- Visual: hotel doors + logo reveal -------------- */

function DoorOverlay({ phase, mode }: { phase: Phase; mode: NavMode }) {
  // Door animation:
  //  closing  → panels move from offscreen to meeting at center
  //  holding  → panels stay closed, logo pulses
  //  opening  → panels slide back out, revealing the new page
  const closed = phase === 'closing' || phase === 'holding';
  const showLogo = closed;

  // Accent tone depends on direction for a subtle narrative:
  //   entering booking = maroon ("inside"), returning home = gold ("outside")
  const panelBg =
    mode === 'enter'
      ? 'linear-gradient(135deg,#5E141E 0%,#3a0d14 60%,#0a0608 100%)'
      : 'linear-gradient(135deg,#FCF1D6 0%,#f0e0b8 60%,#E3AB32 100%)';
  const logoColor = mode === 'enter' ? '#E3AB32' : '#5E141E';
  const dividerColor = mode === 'enter' ? 'rgba(227,171,50,0.8)' : 'rgba(94,20,30,0.8)';
  const subtitleColor = mode === 'enter' ? 'rgba(252,241,214,0.65)' : 'rgba(94,20,30,0.7)';
  const subtitle = mode === 'enter' ? 'Welcome · Reservations' : 'Returning to Lobby';

  return (
    <motion.div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 1 }}
    >
      {/* Left door */}
      <motion.div
        className="absolute top-0 bottom-0 left-0 w-1/2 origin-right"
        style={{ background: panelBg, willChange: 'transform' }}
        initial={{ x: '-100%' }}
        animate={{ x: closed ? '0%' : '-100%' }}
        transition={{
          duration: phase === 'closing' ? 0.7 : 0.9,
          ease: [0.77, 0, 0.175, 1]
        }}
      >
        {/* decorative seam */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1 h-24 bg-gold/40" />
      </motion.div>

      {/* Right door */}
      <motion.div
        className="absolute top-0 bottom-0 right-0 w-1/2 origin-left"
        style={{ background: panelBg, willChange: 'transform' }}
        initial={{ x: '100%' }}
        animate={{ x: closed ? '0%' : '100%' }}
        transition={{
          duration: phase === 'closing' ? 0.7 : 0.9,
          ease: [0.77, 0, 0.175, 1]
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1 h-24 bg-gold/40" />
      </motion.div>

      {/* Center logo reveal */}
      <AnimatePresence>
        {showLogo && (
          <motion.div
            key="logo"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="h-px mb-6"
              style={{ background: dividerColor }}
            />
            <motion.h2
              className="font-serif tracking-[0.6em] text-4xl md:text-6xl font-light"
              style={{ color: logoColor }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              TRESSA
            </motion.h2>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="h-px mt-6 mb-4"
              style={{ background: dividerColor }}
            />
            <p
              className="text-[10px] md:text-[11px] tracking-[0.5em] uppercase"
              style={{ color: subtitleColor }}
            >
              {subtitle}
            </p>

            {/* animated loading line */}
            <div className="mt-10 w-48 h-px bg-black/10 overflow-hidden relative">
              <motion.div
                className="absolute top-0 left-0 h-full w-1/3"
                style={{ background: logoColor }}
                animate={{ x: ['-100%', '300%'] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
