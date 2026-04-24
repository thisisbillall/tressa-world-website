// Static booking configuration. Not mock data — these are product constants
// (hours, slot windows) that don't belong in the database.

import type { Slot, SlotId } from './venueTypes';

export const TIME_SLOTS: Slot[] = [
  { id: 'lunch',  label: '12:00 PM – 3:00 PM',  start: '12:00', end: '15:00' },
  { id: 'tea',    label: '3:00 PM – 5:00 PM',   start: '15:00', end: '17:00' },
  { id: 'dinner', label: '5:00 PM – 8:00 PM',   start: '17:00', end: '20:00' },
  { id: 'night',  label: '8:00 PM – 12:00 AM',  start: '20:00', end: '00:00' },
];

// Every slot is open by default. Real occupancy comes from /api/availability
// and is layered on top in BookingClient.
export const DEFAULT_AVAILABILITY: Record<SlotId, boolean> = {
  lunch: true,
  tea: true,
  dinner: true,
  night: true,
};
