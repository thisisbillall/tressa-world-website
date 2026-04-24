'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TressaLink from '@/components/TressaLink';
import { ArrowLeft, Loader2, Move, RotateCcw } from 'lucide-react';
import { useSiteContent } from '@/lib/siteContent';
import { fetchVenue } from '@/lib/venue';
import { TIME_SLOTS } from '@/lib/venueConfig';
import type { SlotId, Suite, Table, VenueData, VenueId } from '@/lib/venueTypes';
import BookingPanel from '@/components/booking/BookingPanel';
import { useRealtime } from '@/hooks/useRealtime';
import { apiFetch } from '@/lib/apiClient';

type SuiteRange = { suite_name: string; check_in: string; check_out: string };

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

// Suites are under development — not a valid target until launch.
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

  // Live availability sourced from the bookings table via SSE.
  const [reservedTableRefs, setReservedTableRefs] = useState<Set<string>>(new Set());
  const [reservedSuiteRanges, setReservedSuiteRanges] = useState<SuiteRange[]>([]);
  const availabilityDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const apiVenue = venueId === 'suites' ? 'suite' : venueId;

  const loadAvailability = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ venue: apiVenue, date, slot });
      const json = await apiFetch<any>(`/api/availability?${qs.toString()}`, { cache: 'no-store' });
      setReservedTableRefs(new Set<string>(json.reserved_tables || []));
      setReservedSuiteRanges(json.reserved_suite_ranges || []);
    } catch (e: any) {
      console.warn('[availability]', e?.message || e);
    }
  }, [apiVenue, date, slot]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  // Any booking insert/update/delete invalidates availability for every open client.
  useRealtime({
    tables: ['bookings'],
    onInsert: () => {
      if (availabilityDebounceRef.current) clearTimeout(availabilityDebounceRef.current);
      availabilityDebounceRef.current = setTimeout(loadAvailability, 300);
    },
    onUpdate: () => {
      if (availabilityDebounceRef.current) clearTimeout(availabilityDebounceRef.current);
      availabilityDebounceRef.current = setTimeout(loadAvailability, 300);
    },
    onDelete: () => {
      if (availabilityDebounceRef.current) clearTimeout(availabilityDebounceRef.current);
      availabilityDebounceRef.current = setTimeout(loadAvailability, 300);
    },
  });

  // Lock page scroll — the 3D canvas must own touch gestures on mobile
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const reloadVenue = useCallback(async () => {
    const v = await fetchVenue(venueId);
    setVenue(v);
    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    setLoading(true);
    setSelectedTable(null);
    setSelectedSuite(null);
    setPanelOpen(false);
    reloadVenue();
  }, [venueId, reloadVenue]);

  // Suite pricing / catalogue changes (e.g. manager edits a row) → resync the
  // 3D scene so positions stay put but prices refresh. Only matters on 'suites'.
  const suitesDebounceRef = useRef<NodeJS.Timeout | null>(null);
  useRealtime({
    tables: ['suites'],
    onInsert: () => {
      if (venueId !== 'suites') return;
      if (suitesDebounceRef.current) clearTimeout(suitesDebounceRef.current);
      suitesDebounceRef.current = setTimeout(reloadVenue, 300);
    },
    onUpdate: () => {
      if (venueId !== 'suites') return;
      if (suitesDebounceRef.current) clearTimeout(suitesDebounceRef.current);
      suitesDebounceRef.current = setTimeout(reloadVenue, 300);
    },
    onDelete: () => {
      if (venueId !== 'suites') return;
      if (suitesDebounceRef.current) clearTimeout(suitesDebounceRef.current);
      suitesDebounceRef.current = setTimeout(reloadVenue, 300);
    },
  });

  // Merge DB availability into venue.tables so Scene3D's existing
  // `table.availability[slot]` logic reflects actual bookings.
  const liveVenue = useMemo<VenueData | null>(() => {
    if (!venue) return null;
    if (!venue.tables || reservedTableRefs.size === 0) return venue;
    return {
      ...venue,
      tables: venue.tables.map((t) =>
        reservedTableRefs.has(t.label)
          ? { ...t, availability: { ...t.availability, [slot]: false } }
          : t,
      ),
    };
  }, [venue, reservedTableRefs, slot]);

  const availableCount = useMemo(() => {
    if (!liveVenue?.tables) return 0;
    return liveVenue.tables.filter((t) => t.availability[slot]).length;
  }, [liveVenue, slot]);

  const suiteOccupancy = useMemo(() => {
    // suite_name → count of active/future bookings
    const map = new Map<string, number>();
    for (const r of reservedSuiteRanges) {
      map.set(r.suite_name, (map.get(r.suite_name) || 0) + 1);
    }
    return map;
  }, [reservedSuiteRanges]);

  const handleSelectTable = (t: Table) => {
    if (reservedTableRefs.has(t.label)) return; // already booked for this slot/date
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
      <header className="fixed top-0 left-0 right-0 z-30 px-4 md:px-10 py-3 md:py-5 flex items-center justify-between bg-gradient-to-b from-white/90 to-white/20 backdrop-blur-sm border-b border-maroon/10">
        <TressaLink href="/" mode="leave" className="flex items-center gap-1.5 text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-maroon hover:text-gold transition-colors shrink-0">
          <ArrowLeft size={14} /> Back
        </TressaLink>
        <p className="font-serif tracking-[0.3em] md:tracking-[0.4em] text-maroon text-sm md:text-lg truncate mx-3">TRESSA · BOOK</p>
        <div className="text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase text-muted truncate hidden sm:block">
          {venue?.name ?? '...'}
        </div>
      </header>

      {/* 3D canvas */}
      <div className="absolute inset-0 touch-none" style={{ touchAction: 'none' }}>
        {liveVenue && !loading && (
          <Scene3D
            key={`${liveVenue.id}-${resetKey}`}
            venue={liveVenue}
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
      <div className="fixed bottom-0 left-0 right-0 z-20 p-3 md:p-8 bg-gradient-to-t from-[#fdf8ea] via-[#fdf8ea]/85 to-transparent pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <div className="flex gap-1.5 md:gap-3 mb-2 md:mb-4 flex-wrap">
            {VENUES.map((v) => (
              <button
                key={v.id}
                onClick={() => !v.disabled && setVenueId(v.id)}
                disabled={v.disabled}
                title={v.disabled ? 'Aura (Suites) is under development' : undefined}
                className={`px-3 md:px-5 py-1.5 md:py-2.5 text-[9px] md:text-[11px] tracking-[0.2em] md:tracking-[0.25em] uppercase border transition-all ${
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

          {liveVenue?.tables && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-row items-end gap-2 md:gap-4 bg-white/90 backdrop-blur-md border border-maroon/10 p-2.5 md:p-5 shadow-[0_10px_40px_rgba(94,20,30,0.08)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[8px] md:text-[9px] tracking-[0.25em] md:tracking-[0.3em] uppercase text-maroon mb-1.5 md:mb-2">Time Slot</p>
                <div className="flex gap-1 md:gap-2 flex-wrap">
                  {TIME_SLOTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSlot(s.id)}
                      className={`px-2 md:px-3 py-1 md:py-2 text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.15em] uppercase border transition-all ${slot === s.id
                          ? 'bg-maroon border-maroon text-cream'
                          : 'border-maroon/15 text-muted hover:border-gold hover:text-maroon'
                        }`}
                    >
                      {slotLabel(s.id)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white border border-maroon/15 text-ink text-[11px] md:text-sm px-2 md:px-3 py-1 md:py-2 focus:outline-none focus:border-gold w-[115px] md:w-auto"
                />
              </div>

              <div className="text-right shrink-0 pl-2 md:pl-4 border-l border-maroon/10">
                <p className="text-[8px] md:text-[9px] tracking-[0.2em] md:tracking-[0.3em] uppercase text-maroon">Open</p>
                <p className="font-serif text-lg md:text-2xl text-maroon">
                  {availableCount}<span className="text-muted text-[10px] md:text-sm">/{liveVenue.tables.length}</span>
                </p>
              </div>
            </motion.div>
          )}

          {liveVenue?.suites && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-md border border-maroon/10 p-4 md:p-5 text-[11px] tracking-[0.2em] uppercase text-muted shadow-[0_10px_40px_rgba(94,20,30,0.08)]"
            >
              Click a suite to preview and pick your dates. {liveVenue.suites.length} suites available
              {reservedSuiteRanges.length > 0 && ` · ${reservedSuiteRanges.length} active booking${reservedSuiteRanges.length > 1 ? 's' : ''}`}.
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
          className="absolute top-14 md:top-24 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none px-4"
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
        className="absolute top-14 right-3 md:top-24 md:right-6 z-10 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/90 border border-maroon/15 text-maroon hover:border-gold hover:text-gold transition-colors shadow-sm"
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
