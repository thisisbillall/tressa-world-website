'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Preloader() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1700);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden px-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: '-100%' }}
          transition={{ duration: 0.9, ease: [0.77, 0, 0.175, 1] }}
        >
          <motion.div
            className="text-maroon font-serif font-light tracking-[0.25em] sm:tracking-[0.5em] md:tracking-[0.8em] text-3xl sm:text-5xl md:text-7xl text-center"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          >
            TRESSA
          </motion.div>
          <div className="mt-8 w-40 sm:w-52 h-px bg-maroon/15 overflow-hidden relative">
            <motion.div
              className="absolute top-0 left-0 h-full w-1/3 bg-maroon"
              animate={{ x: ['-120%', '380%'] }}
              transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
