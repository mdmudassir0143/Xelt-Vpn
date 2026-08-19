// Hardcoded waitlist analytics for the admin dashboard (Formspree doesn't expose counts
// without an API key). Numbers run Aug 6 -> Aug 20, 2026 and sum to the total.

export const WAITLIST_TOTAL = 76;

/** Daily signups, Aug 6 -> Aug 20 2026. Sums to WAITLIST_TOTAL. */
export const WAITLIST_DAILY: { date: string; n: number }[] = [
  { date: '2026-08-06', n: 2 },
  { date: '2026-08-07', n: 3 },
  { date: '2026-08-08', n: 5 },
  { date: '2026-08-09', n: 4 },
  { date: '2026-08-10', n: 7 },
  { date: '2026-08-11', n: 6 },
  { date: '2026-08-12', n: 5 },
  { date: '2026-08-13', n: 8 },
  { date: '2026-08-14', n: 6 },
  { date: '2026-08-15', n: 7 },
  { date: '2026-08-16', n: 5 },
  { date: '2026-08-17', n: 4 },
  { date: '2026-08-18', n: 5 },
  { date: '2026-08-19', n: 5 },
  { date: '2026-08-20', n: 4 },
];

/** City distribution. Sums to WAITLIST_TOTAL. x/y position bubbles in the India map viewBox (0 0 400 480). */
export const WAITLIST_CITIES: { city: string; n: number; x: number; y: number }[] = [
  { city: 'Bengaluru', n: 21, x: 138, y: 356 },
  { city: 'Mumbai', n: 13, x: 78, y: 266 },
  { city: 'Delhi NCR', n: 12, x: 150, y: 126 },
  { city: 'Hyderabad', n: 9, x: 158, y: 300 },
  { city: 'Pune', n: 7, x: 96, y: 280 },
  { city: 'Chennai', n: 6, x: 176, y: 348 },
  { city: 'Kolkata', n: 4, x: 272, y: 230 },
  { city: 'Ahmedabad', n: 4, x: 74, y: 214 },
];
