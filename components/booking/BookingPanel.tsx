'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, Users, Calendar, Clock, Bed } from 'lucide-react';
import {
  submitBooking,
  TIME_SLOTS,
  type BookingPayload,
  type BookingResult,
  type SlotId,
  type Suite,
  type Table,
  type VenueId
} from '@/lib/mockApi';

type Props = {
  open: boolean;
  venue: VenueId;
  selectedTable: Table | null;
  selectedSuite: Suite | null;
  slot: SlotId;
  date: string;
  onClose: () => void;
};

export default function BookingPanel({ open, venue, selectedTable, selectedSuite, slot, date, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  const isSuite = !!selectedSuite;
  const slotLabel = TIME_SLOTS.find((s) => s.id === slot)?.label;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);

    const payload: BookingPayload = isSuite
      ? {
          kind: 'suite',
          suiteId: selectedSuite!.id,
          checkIn: String(f.get('checkin')),
          checkOut: String(f.get('checkout')),
          guests: Number(f.get('guests')),
          name: String(f.get('name')),
          phone: String(f.get('phone')),
          email: String(f.get('email')),
          notes: String(f.get('notes') || '')
        }
      : {
          kind: 'table',
          venue,
          tableId: selectedTable!.id,
          slot,
          date,
          guests: Number(f.get('guests')),
          name: String(f.get('name')),
          phone: String(f.get('phone')),
          email: String(f.get('email')),
          notes: String(f.get('notes') || '')
        };

    const res = await submitBooking(payload);
    setSending(false);
    setResult(res);
  };

  const close = () => {
    setResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (selectedTable || selectedSuite) && (
        <motion.aside
          key="panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.55, ease: [0.77, 0, 0.175, 1] }}
          className="fixed top-0 right-0 h-full z-50 w-full sm:w-[480px] bg-white text-ink shadow-[0_0_80px_rgba(94,20,30,0.18)] overflow-y-auto border-l border-maroon/10"
        >
          <div className="relative min-h-full">
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center border border-maroon/20 text-maroon hover:border-gold hover:text-gold transition-colors"
            >
              <X size={16} />
            </button>

            <div className="p-8 pt-20">
              {result ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-gold flex items-center justify-center text-gold text-3xl">✓</div>
                  <h3 className="font-serif text-3xl mt-6 font-light text-maroon">Confirmed</h3>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gold mt-2">{result.confirmationId}</p>
                  <p className="mt-6 text-sm text-muted leading-relaxed">{result.message}</p>
                  <p className="mt-6 text-xs text-muted/70">A confirmation has been sent to your email and phone.</p>
                  <button onClick={close} className="btn-primary mt-10"><span>Done</span></button>
                </motion.div>
              ) : (
                <>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-maroon">{isSuite ? 'Suite Booking' : 'Table Reservation'}</p>
                  <h3 className="font-serif text-3xl md:text-4xl font-light mt-2 text-ink">
                    {isSuite ? selectedSuite!.name : `Table ${selectedTable!.label}`}
                  </h3>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-[11px] tracking-[0.15em] uppercase">
                    {isSuite ? (
                      <>
                        <Info icon={<Bed size={12} />} label={`${selectedSuite!.beds} Bed${selectedSuite!.beds > 1 ? 's' : ''}`} />
                        <Info label={`${selectedSuite!.sqft} sq.ft`} />
                        <Info label={selectedSuite!.tag} />
                        <Info label={`₹ ${selectedSuite!.priceNight.toLocaleString()}/nt`} highlight />
                      </>
                    ) : (
                      <>
                        <Info icon={<Users size={12} />} label={`${selectedTable!.seats} Seats`} />
                        <Info label={selectedTable!.shape} />
                        <Info icon={<Clock size={12} />} label={slotLabel ?? ''} />
                        <Info icon={<Calendar size={12} />} label={date} />
                      </>
                    )}
                  </div>

                  <form onSubmit={submit} className="mt-8 space-y-5">
                    <TextInput label="Full Name" name="name" required />
                    <TextInput label="Phone" name="phone" type="tel" required />
                    <TextInput label="Email" name="email" type="email" required />

                    {isSuite ? (
                      <div className="grid grid-cols-2 gap-4">
                        <TextInput label="Check-In" name="checkin" type="date" required defaultValue={selectedSuite!.availableDates[0]} />
                        <TextInput label="Check-Out" name="checkout" type="date" required defaultValue={selectedSuite!.availableDates[1]} />
                      </div>
                    ) : null}

                    <TextInput label="Guests" name="guests" type="number" min={1} max={isSuite ? 8 : selectedTable!.seats} defaultValue={2} required />

                    <div>
                      <label className="block text-[9px] tracking-[0.3em] uppercase text-maroon mb-2">Special Requests</label>
                      <textarea
                        name="notes"
                        rows={2}
                        className="w-full bg-transparent border-b border-maroon/20 text-ink text-sm py-2 focus:outline-none focus:border-gold transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full relative overflow-hidden py-4 text-[11px] tracking-[0.3em] uppercase bg-maroon text-cream font-medium group disabled:opacity-60"
                    >
                      <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                      <span className="relative group-hover:text-maroon transition-colors">{sending ? 'Confirming…' : 'Confirm Booking'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Info({ icon, label, highlight }: { icon?: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border px-3 py-2 ${highlight ? 'border-gold text-maroon bg-gold/10' : 'border-maroon/15 text-muted'}`}>
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function TextInput({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-[9px] tracking-[0.3em] uppercase text-maroon mb-2">{label}</label>
      <input
        {...rest}
        className="w-full bg-transparent border-b border-maroon/20 text-ink text-sm py-2 focus:outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}
