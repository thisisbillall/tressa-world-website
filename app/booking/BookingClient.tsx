'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TressaLink from '@/components/TressaLink';
import { ArrowLeft, Loader2, Move, RotateCcw } from 'lucide-react';
import { useSiteContent } from '@/lib/siteContent';
import {
  fetchVenue,
  TIME_SLOTS,
  type SlotId,
  type Suite,
  type Table,
  type VenueData,
  type VenueId
} from '@/lib/mockApi';
import BookingPanel from '@/components/booking/BookingPanel';

const Scene3D = dynamic(() => import('@/components/booking/Scene3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-maroon/60">
      <Loader2 className="animate-spin" />
    </div>
  )
});

const VENUES: { id: VenueId; label: string; disabled?: boolean }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'rooftop', label: 'The Sky' },
  { id: 'bar', label: 'Bar' },
  { id: 'suites', label: 'Aura · Coming Soon', disabled: true }
];

// Suites (Aura) is under development — not a valid target until launch.
const VALID_VENUES: VenueId[] = ['restaurant', 'rooftop', 'bar'];

export default function BookingClient() {
  const searchParams = useSearchParams();
  const initialVenue = (() => {
    const q = searchParams.get('venue') as VenueId | null;
    return q && VALID_VENUES.includes(q) ? q : 'restaurant';
  })();
  const [venueId, setVenueId] = useState<VenueId>(initialVenue);
  const [siteContent] = useSiteContent();
  const slotLabel = (id: string) => siteContent.timeSlots.find((s) => s.id === id)?.label
    ?? TIME_SLOTS.find((s) => s.id === id)?.label ?? id;

  // keep the tab in sync if the URL changes while the page is open
  useEffect(() => {
    const q = searchParams.get('venue') as VenueId | null;
    if (q && VALID_VENUES.includes(q) && q !== venueId) {
      setVenueId(q);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<SlotId>('dinner');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<Suite | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Lock page scroll — the 3D canvas must own touch gestures on mobile
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelectedTable(null);
    setSelectedSuite(null);
    setPanelOpen(false);
    fetchVenue(venueId).then((v) => {
      setVenue(v);
      setLoading(false);
    });
  }, [venueId]);

  const availableCount = useMemo(() => {
    if (!venue?.tables) return 0;
    return venue.tables.filter((t) => t.availability[slot]).length;
  }, [venue, slot]);

  const handleSelectTable = (t: Table) => {
    setTimeout(() => setPanelOpen(true), 900);
    setSelectedTable(t);
    setSelectedSuite(null);
  };

  const handleSelectSuite = (s: Suite) => {
    setTimeout(() => setPanelOpen(true), 900);
    setSelectedSuite(s);
    setSelectedTable(null);
  };

  const deselect = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setSelectedTable(null);
      setSelectedSuite(null);
    }, 400);
  };

  return (
    <main className="fixed inset-0 bg-[#fdf8ea] text-ink overflow-hidden touch-none">
      {/* top bar */}
      <header className="fixed top-0 left-0 right-0 z-30 px-6 md:px-10 py-5 flex items-center justify-between bg-gradient-to-b from-white/90 to-white/20 backdrop-blur-sm border-b border-maroon/10">
        <TressaLink href="/" mode="leave" className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-maroon hover:text-gold transition-colors">
          <ArrowLeft size={14} /> Back
        </TressaLink>
        <p className="font-serif tracking-[0.4em] text-maroon text-base md:text-lg">TRESSA · BOOK</p>
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted">
          {venue?.name ?? '...'}
        </div>
      </header>

      {/* 3D canvas */}
      <div className="absolute inset-0 touch-none" style={{ touchAction: 'none' }}>
        {venue && !loading && (
          <Scene3D
            key={`${venue.id}-${resetKey}`}
            venue={venue}
            slot={slot}
            selectedId={selectedTable?.id ?? selectedSuite?.id ?? null}
            onSelectTable={handleSelectTable}
            onSelectSuite={handleSelectSuite}
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-maroon/70">
            <Loader2 className="animate-spin mr-3" /> Loading {venueId}…
          </div>
        )}
      </div>

      {/* bottom control rail */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-5 md:p-8 bg-gradient-to-t from-[#fdf8ea] via-[#fdf8ea]/85 to-transparent pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <div className="flex gap-2 md:gap-3 mb-4 flex-wrap">
            {VENUES.map((v) => (
              <button
                key={v.id}
                onClick={() => !v.disabled && setVenueId(v.id)}
                disabled={v.disabled}
                title={v.disabled ? 'Aura (Suites) is under development' : undefined}
                className={`px-4 md:px-5 py-2.5 text-[10px] md:text-[11px] tracking-[0.25em] uppercase border transition-all ${
                  v.disabled
                    ? 'bg-white/40 border-maroon/10 text-muted/60 cursor-not-allowed italic'
                    : venueId === v.id
                      ? 'bg-maroon text-cream border-maroon'
                      : 'bg-white/80 border-maroon/20 text-maroon hover:border-gold hover:text-gold'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {venue?.tables && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-end gap-4 bg-white/90 backdrop-blur-md border border-maroon/10 p-4 md:p-5 shadow-[0_10px_40px_rgba(94,20,30,0.08)]"
            >
              <div className="flex-1">
                <p className="text-[9px] tracking-[0.3em] uppercase text-maroon mb-2">Time Slot</p>
                <div className="flex gap-2 flex-wrap">
                  {TIME_SLOTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSlot(s.id)}
                      className={`px-3 py-2 text-[10px] tracking-[0.15em] uppercase border transition-all ${slot === s.id
                          ? 'bg-maroon border-maroon text-cream'
                          : 'border-maroon/15 text-muted hover:border-gold hover:text-maroon'
                        }`}
                    >
                      {slotLabel(s.id)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] tracking-[0.3em] uppercase text-maroon mb-2">Date</p>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white border border-maroon/15 text-ink text-sm px-3 py-2 focus:outline-none focus:border-gold"
                />
              </div>

              <div className="text-right md:pl-4 md:border-l md:border-maroon/10">
                <p className="text-[9px] tracking-[0.3em] uppercase text-maroon">Available</p>
                <p className="font-serif text-2xl text-maroon mt-1">
                  {availableCount}<span className="text-muted text-sm"> / {venue.tables.length}</span>
                </p>
              </div>
            </motion.div>
          )}

          {venue?.suites && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-md border border-maroon/10 p-4 md:p-5 text-[11px] tracking-[0.2em] uppercase text-muted shadow-[0_10px_40px_rgba(94,20,30,0.08)]"
            >
              Click a suite to preview and pick your dates. {venue.suites.length} suites available.
            </motion.div>
          )}
        </div>
      </div>

      {/* hint */}
      {!selectedTable && !selectedSuite && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none px-4"
        >
          <p className="text-[10px] tracking-[0.4em] md:tracking-[0.5em] uppercase text-maroon">
            Tap a {venue?.suites ? 'Suite' : 'Table'} to zoom
          </p>
          <p className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-muted mt-1 flex items-center justify-center gap-2">
            <Move size={11} /> Drag · Pinch to zoom
          </p>
        </motion.div>
      )}

      {/* reset view */}
      <button
        onClick={() => { deselect(); setResetKey((k) => k + 1); }}
        className="absolute top-20 right-4 md:top-24 md:right-6 z-10 w-10 h-10 flex items-center justify-center bg-white/90 border border-maroon/15 text-maroon hover:border-gold hover:text-gold transition-colors shadow-sm"
        aria-label="Reset view"
        title="Reset view"
      >
        <RotateCcw size={14} />
      </button>

      <BookingPanel
        open={panelOpen}
        venue={venueId}
        selectedTable={selectedTable}
        selectedSuite={selectedSuite}
        slot={slot}
        date={date}
        onClose={deselect}
      />
    </main>
  );
}
