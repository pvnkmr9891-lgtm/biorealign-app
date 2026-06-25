// The only bookable in-person Recovery time slots, for now — deliberately a
// fixed, short list rather than an arbitrary start/end time range, so the
// admin availability screen and the client slot picker can't drift out of
// sync with each other.
export interface RehabSlotOption {
  label: string;
  startTime: string; // HH:MM:SS
  endTime: string;   // HH:MM:SS
}

export const REHAB_SLOT_OPTIONS: RehabSlotOption[] = [
  { label: '10:30 AM – 11:30 AM', startTime: '10:30:00', endTime: '11:30:00' },
  { label: '11:30 AM – 12:30 PM', startTime: '11:30:00', endTime: '12:30:00' },
  { label: '2:00 PM – 3:00 PM',   startTime: '14:00:00', endTime: '15:00:00' },
  { label: '3:00 PM – 4:00 PM',   startTime: '15:00:00', endTime: '16:00:00' },
  { label: '6:30 PM – 7:30 PM',   startTime: '18:30:00', endTime: '19:30:00' },
  { label: '7:30 PM – 8:30 PM',   startTime: '19:30:00', endTime: '20:30:00' },
];
