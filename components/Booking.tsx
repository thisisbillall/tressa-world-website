'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const BookingScene3D = dynamic(() => import('./BookingScenes'), { ssr: false });

type Venue = 'bar' | 'restaurant' | 'suite' | 'rooftop';

const venues: Record<Venue, {
  label: string;
  floor: string;
  tagline: string;
  image: string;
  icon: string;
  gradient: string;
  accent: string;
}> = {
  bar: {
    label: 'The Bar',
    floor: 'Basement Level · B1',
    tagline: 'Dim lights, deep pours & low-slung leather.',
    image: '/images/venues/unwind/tressa-unwind-02.webp',
    icon: '🍸',
    gradient: 'from-black via-[#1a0a0a] to-[#2a0f0f]',
    accent: '#E3AB32',
  },
  restaurant: {
    label: 'Restaurant',
    floor: 'Ground Floor · G',
    tagline: 'Heritage plates served under warm chandelier light.',
    image: '/images/venues/soul/tressa-soul-02.webp',
    icon: '🍽',
    gradient: 'from-maroon via-maroon-dark to-forest',
    accent: '#E3AB32',
  },
  suite: {
    label: 'Suites',
    floor: 'Floors 1 & 2',
    tagline: 'Linens turned down, city waiting beyond the curtain.',
    image: '/images/private-dining.jpg',
    icon: '🛏',
    gradient: 'from-[#2a1810] via-[#3d2418] to-[#1a0f08]',
    accent: '#E3AB32',
  },
  rooftop: {
    label: 'Rooftop',
    floor: 'Top Floor · Open Sky',
    tagline: 'Stars above, skyline below, cocktails in hand.',
    image: '/images/venues/sky/tressa-sky-01.webp',
    icon: '✦',
    gradient: 'from-[#0a1628] via-[#1a2847] to-[#3d2a5c]',
    accent: '#E3AB32',
  },
};

export default function Booking() {
  const [venue, setVenue] = useState<Venue>('restaurant');
  const [sent, setSent] = useState(false);
  const v = venues[venue];
  const isSuite = venue === 'suite';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="booking" className="relative py-32 px-6 md:px-[8%] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={venue}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${v.image})` }}
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${v.gradient} opacity-80`} />
          <div className="absolute inset-0">
            <BookingScene3D scene={venue} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
          <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-center mb-12"
        >
          <p className="text-[11px] tracking-[0.5em] uppercase text-gold mb-4">Reserve</p>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-cream">Book Your Moment</h2>
          <p className="text-cream/70 mt-4 text-sm">Four worlds, one address — choose your floor.</p>
        </motion.div>

        {/* Floor-level tab selector */}
        <div className="relative mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {(Object.keys(venues) as Venue[]).map((k) => {
              const item = venues[k];
              const active = venue === k;
              return (
                <button
                  key={k}
                  onClick={() => setVenue(k)}
                  className={`group relative overflow-hidden border transition-all duration-500 ${
                    active
                      ? 'border-gold bg-gold/10 shadow-[0_0_30px_rgba(227,171,50,0.3)]'
                      : 'border-cream/20 bg-black/20 hover:border-cream/50'
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
                      active ? 'opacity-40' : 'opacity-15 group-hover:opacity-25'
                    }`}
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                  <div className="relative p-4 md:p-5 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{item.icon}</span>
                      {active && (
                        <motion.span
                          layoutId="dot"
                          className="w-2 h-2 rounded-full bg-gold"
                        />
                      )}
                    </div>
                    <p className={`font-serif text-lg md:text-xl ${active ? 'text-gold' : 'text-cream'}`}>
                      {item.label}
                    </p>
                    <p className="text-[9px] md:text-[10px] tracking-[0.25em] uppercase text-cream/60 mt-1">
                      {item.floor}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-cream/15 p-8 md:p-12"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={venue + '-tag'}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center font-serif italic text-cream/80 mb-8 text-lg"
            >
              “{v.tagline}”
            </motion.p>
          </AnimatePresence>

          <form onSubmit={submit} className="grid md:grid-cols-2 gap-5">
            <Field label="Full Name" name="name" required />
            <Field label="Phone" name="phone" type="tel" required />
            <Field label="Email" name="email" type="email" required />

            {!isSuite ? (
              <>
                <Field label="Date" name="date" type="date" required />
                <Field label="Time" name="time" type="time" required />
                <Field
                  label="Guests"
                  name="guests"
                  type="number"
                  min={1}
                  max={40}
                  defaultValue={2}
                  required
                />
              </>
            ) : (
              <>
                <Select
                  label="Suite"
                  name="suite"
                  options={['Royal Suite (Floor 2)', 'Garden Suite (Floor 1)', 'Heritage Suite (Floor 2)']}
                />
                <Field label="Check-In" name="checkin" type="date" required />
                <Field label="Check-Out" name="checkout" type="date" required />
                <Field label="Guests" name="guests" type="number" min={1} max={8} defaultValue={2} required />
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-gold mb-2">Special Requests</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full bg-transparent border-b border-cream/25 text-cream py-2 focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between mt-4 flex-wrap gap-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-cream/50">
                Confirmation sent via email &amp; SMS
              </p>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.96 }}
                className="relative overflow-hidden px-10 py-4 text-[11px] tracking-[0.3em] uppercase border border-gold text-maroon bg-gold group"
              >
                <span className="absolute inset-0 bg-cream translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative">
                  {sent ? 'Reservation Received ✓' : `Reserve at ${v.label}`}
                </span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────── AMBIENCE LAYERS ───────── */

function RooftopAmbience() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Evening sky gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1b4b]/40 via-transparent to-[#2d1b4e]/60" />

      {/* Moon */}
      <div className="absolute top-[8%] right-[12%]">
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cream/90 to-cream/40 shadow-[0_0_60px_20px_rgba(255,245,220,0.25)]" />
      </div>

      {/* Stars */}
      {[...Array(50)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute w-[2px] h-[2px] bg-cream rounded-full"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 60}%` }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.1 }}
        />
      ))}

      {/* City skyline silhouette */}
      <svg
        className="absolute bottom-0 left-0 w-full opacity-60"
        viewBox="0 0 1200 180"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          d="M0,180 L0,120 L40,120 L40,90 L80,90 L80,110 L120,110 L120,70 L160,70 L160,100 L200,100 L200,60 L240,60 L240,95 L290,95 L290,80 L330,80 L330,110 L380,110 L380,50 L420,50 L420,85 L470,85 L470,65 L510,65 L510,100 L560,100 L560,75 L610,75 L610,55 L660,55 L660,90 L710,90 L710,70 L760,70 L760,105 L810,105 L810,60 L860,60 L860,95 L910,95 L910,80 L960,80 L960,110 L1010,110 L1010,75 L1060,75 L1060,95 L1110,95 L1110,65 L1160,65 L1160,100 L1200,100 L1200,180 Z"
          fill="url(#sky)"
        />
        {/* Lit windows */}
        {[
          [50, 105], [95, 100], [135, 85], [175, 115], [215, 75], [255, 110],
          [305, 95], [345, 125], [395, 65], [435, 100], [485, 80], [525, 115],
          [575, 90], [625, 70], [675, 105], [725, 85], [775, 120], [825, 75],
          [875, 110], [925, 95], [975, 125], [1025, 90], [1075, 110], [1125, 80],
        ].map(([x, y], i) => (
          <motion.rect
            key={i}
            x={x}
            y={y}
            width={3}
            height={3}
            fill="#E3AB32"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </svg>

      {/* Candles on table edges */}
      <div className="absolute bottom-[15%] left-[6%] hidden md:block">
        <Candle />
      </div>
      <div className="absolute bottom-[22%] right-[8%] hidden md:block">
        <Candle />
      </div>
      <div className="absolute top-[40%] right-[4%] hidden lg:block">
        <Candle small />
      </div>

      {/* Fairy lights across top */}
      <svg className="absolute top-0 left-0 w-full h-16" preserveAspectRatio="none" viewBox="0 0 1200 60">
        <path d="M0,5 Q300,45 600,20 T1200,15" fill="none" stroke="#E3AB32" strokeWidth="0.5" opacity="0.4" />
        {[...Array(24)].map((_, i) => {
          const x = (i + 1) * 48;
          const y = 5 + Math.sin(i * 0.7) * 15 + 15;
          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r={1.8}
              fill="#E3AB32"
              animate={{ opacity: [0.4, 1, 0.4], r: [1.5, 2.5, 1.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
            />
          );
        })}
      </svg>
    </div>
  );
}

function Candle({ small = false }: { small?: boolean }) {
  const h = small ? 'h-16' : 'h-24';
  const w = small ? 'w-3' : 'w-5';
  return (
    <div className="relative flex flex-col items-center">
      {/* flame glow */}
      <div className="absolute -top-6 w-16 h-16 rounded-full bg-gold/30 blur-2xl" />
      {/* flame */}
      <motion.div
        className="w-2 h-4 rounded-full bg-gradient-to-t from-gold via-[#FFD27A] to-cream"
        animate={{ scaleY: [1, 1.15, 0.95, 1], rotate: [-2, 2, -1, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{ transformOrigin: 'bottom' }}
      />
      {/* wick shadow */}
      <div className="w-[1px] h-1 bg-black/60" />
      {/* candle body */}
      <div className={`${w} ${h} bg-gradient-to-b from-cream/90 via-cream/70 to-cream/40 rounded-sm shadow-[0_0_20px_rgba(227,171,50,0.4)]`} />
    </div>
  );
}

function BarAmbience() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* basement glow from below */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gold/20 to-transparent" />

      {/* back-bar shelf with bottles */}
      <div className="absolute top-[18%] left-0 right-0 hidden md:block">
        <div className="mx-auto max-w-6xl px-8">
          {/* shelf plank */}
          <div className="relative h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          {/* backlight */}
          <div className="absolute -top-2 left-0 right-0 h-24 bg-gradient-to-b from-gold/15 to-transparent blur-xl" />
          {/* bottles */}
          <div className="absolute -top-20 left-0 right-0 flex justify-between px-4">
            {[...Array(18)].map((_, i) => (
              <Bottle key={i} variant={i % 4} delay={i * 0.15} />
            ))}
          </div>
        </div>
      </div>

      {/* Second shelf */}
      <div className="absolute top-[38%] left-0 right-0 hidden lg:block">
        <div className="mx-auto max-w-5xl px-8">
          <div className="relative h-[2px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="absolute -top-16 left-0 right-0 flex justify-between px-8">
            {[...Array(14)].map((_, i) => (
              <Bottle key={i} variant={(i + 2) % 4} small delay={i * 0.12} />
            ))}
          </div>
        </div>
      </div>

      {/* neon sign */}
      <motion.div
        className="absolute top-[6%] right-[8%] font-serif italic text-3xl text-gold hidden md:block"
        animate={{ opacity: [0.7, 1, 0.8, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ textShadow: '0 0 12px #E3AB32, 0 0 24px #E3AB32' }}
      >
        Open
      </motion.div>
    </div>
  );
}

function Bottle({ variant = 0, small = false, delay = 0 }: { variant?: number; small?: boolean; delay?: number }) {
  const colors = ['#4a2512', '#1a3d2a', '#3d1a1a', '#2a2040'];
  const h = small ? 36 : 56;
  const w = small ? 8 : 12;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 0.85, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className="flex flex-col items-center"
    >
      {/* neck */}
      <div style={{ width: w / 3, height: h / 4, background: colors[variant] }} />
      {/* body */}
      <div
        style={{
          width: w,
          height: h,
          background: `linear-gradient(to right, ${colors[variant]}, ${colors[variant]}dd, ${colors[variant]})`,
          borderRadius: '2px 2px 1px 1px',
          boxShadow: `0 0 8px ${colors[variant]}, inset 2px 0 2px rgba(255,255,255,0.15)`,
        }}
      />
      {/* label */}
      <div style={{ width: w - 2, height: 6, marginTop: -h * 0.55, background: '#E3AB32', opacity: 0.7 }} />
    </motion.div>
  );
}

function RestaurantAmbience() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* chandelier glow */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-gold/25 to-transparent" />

      {/* Chandelier */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center">
        <div className="w-[1px] h-16 bg-cream/30" />
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gold/10 blur-2xl absolute -inset-4" />
          <svg width="80" height="60" viewBox="0 0 80 60">
            <circle cx="40" cy="10" r="3" fill="#E3AB32" />
            <path d="M40,10 L15,35 M40,10 L65,35 M40,10 L40,40" stroke="#E3AB32" strokeWidth="0.5" opacity="0.6" />
            {[[15, 35], [40, 40], [65, 35], [25, 45], [55, 45]].map(([x, y], i) => (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r={2.5}
                fill="#FFD27A"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                style={{ filter: 'drop-shadow(0 0 4px #E3AB32)' }}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Potted plants — left */}
      <div className="absolute bottom-0 left-[2%] hidden md:block">
        <Plant tall />
      </div>
      {/* Potted plants — right */}
      <div className="absolute bottom-0 right-[3%] hidden md:block">
        <Plant />
      </div>
      <div className="absolute bottom-0 right-[14%] hidden lg:block">
        <Plant small />
      </div>
      <div className="absolute bottom-0 left-[14%] hidden lg:block">
        <Plant small />
      </div>

      {/* Hanging vines top corners */}
      <svg className="absolute top-0 left-0 w-48 h-48 opacity-70" viewBox="0 0 200 200">
        <path d="M10,0 Q30,50 20,100 Q10,130 30,160" stroke="#2a5d3a" strokeWidth="2" fill="none" />
        {[[15, 30], [22, 70], [18, 110], [28, 145]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="8" ry="4" fill="#2a5d3a" transform={`rotate(${i * 25} ${x} ${y})`} />
        ))}
      </svg>
      <svg className="absolute top-0 right-0 w-48 h-48 opacity-70 scale-x-[-1]" viewBox="0 0 200 200">
        <path d="M10,0 Q30,50 20,100 Q10,130 30,160" stroke="#2a5d3a" strokeWidth="2" fill="none" />
        {[[15, 30], [22, 70], [18, 110], [28, 145]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="8" ry="4" fill="#2a5d3a" transform={`rotate(${i * 25} ${x} ${y})`} />
        ))}
      </svg>
    </div>
  );
}

function Plant({ tall = false, small = false }: { tall?: boolean; small?: boolean }) {
  const scale = tall ? 1.4 : small ? 0.7 : 1;
  return (
    <motion.div
      animate={{ rotate: [-1, 1, -1] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: 'bottom center', transform: `scale(${scale})` }}
    >
      <svg width="120" height="180" viewBox="0 0 120 180">
        {/* leaves */}
        {[
          { x: 60, y: 40, r: -30, s: 1.2 },
          { x: 60, y: 30, r: 30, s: 1.1 },
          { x: 60, y: 50, r: -60, s: 1 },
          { x: 60, y: 50, r: 60, s: 1 },
          { x: 60, y: 20, r: 0, s: 1.3 },
          { x: 60, y: 70, r: -90, s: 0.9 },
          { x: 60, y: 70, r: 90, s: 0.9 },
        ].map((l, i) => (
          <ellipse
            key={i}
            cx={l.x}
            cy={l.y}
            rx={10 * l.s}
            ry={35 * l.s}
            fill="#2a5d3a"
            opacity={0.85}
            transform={`rotate(${l.r} ${l.x} ${l.y})`}
          />
        ))}
        {/* stem */}
        <rect x="58" y="90" width="4" height="40" fill="#3d2818" />
        {/* pot */}
        <path d="M40,130 L80,130 L75,175 L45,175 Z" fill="#5a3a1f" />
        <rect x="38" y="128" width="44" height="6" fill="#6b4726" />
      </svg>
    </motion.div>
  );
}

function SuiteAmbience() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Floor divider lines with floor labels */}
      <div className="absolute inset-y-0 left-4 hidden md:flex flex-col justify-around text-[9px] tracking-[0.4em] uppercase text-cream/40">
        <span>Floor 2</span>
        <span>Floor 1</span>
        <span>Lobby</span>
      </div>
      <div className="absolute left-0 right-0 top-1/3 h-px bg-cream/10" />
      <div className="absolute left-0 right-0 top-2/3 h-px bg-cream/10" />

      {/* Window lights on each floor — right side */}
      <div className="absolute right-[4%] top-[12%] hidden md:flex flex-col gap-3">
        {[...Array(3)].map((_, f) => (
          <div key={f} className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-4 h-6 bg-gold/30 border border-gold/50"
                animate={{ opacity: [0.3, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: (f * 3 + i) * 0.4 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', required = false, ...rest }: any) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
        {label}
        {required && ' *'}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        {...rest}
        className="w-full bg-transparent border-b border-cream/25 text-cream py-2 focus:outline-none focus:border-gold transition-colors placeholder:text-cream/30"
      />
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.3em] uppercase text-gold mb-2">{label}</label>
      <select
        name={name}
        required
        className="w-full bg-transparent border-b border-cream/25 text-cream py-2 focus:outline-none focus:border-gold transition-colors appearance-none"
        style={{
          backgroundImage:
            'linear-gradient(45deg, transparent 50%, #E3AB32 50%), linear-gradient(135deg, #E3AB32 50%, transparent 50%)',
          backgroundPosition: 'calc(100% - 15px) 14px, calc(100% - 10px) 14px',
          backgroundSize: '5px 5px, 5px 5px',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-maroon text-cream">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
