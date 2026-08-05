import type { Show } from "./types";

/**
 * Venue names confirmed by DOTM only for Delhi so far. Others render as
 * "VENUE TBD" in the UI rather than inventing a name. Upcoming city dates
 * are placeholder 2027 (no month/day committed yet) per DOTM's direction.
 */
export const shows: Show[] = [
  {
    id: "goa-2024",
    city: { en: "Goa", hi: "गोवा" },
    country: "India",
    venue: null,
    date: "2024-03-25",
    isPast: true,
    mapCoords: [74.124, 15.2993],
  },
  {
    id: "bangalore-2024",
    city: { en: "Bangalore", hi: "बैंगलोर" },
    country: "India",
    venue: null,
    date: "2024-07-13",
    isPast: true,
    mapCoords: [77.5946, 12.9716],
  },
  {
    id: "mumbai-2024",
    city: { en: "Mumbai", hi: "मुंबई" },
    country: "India",
    venue: null,
    date: "2024-10-11",
    isPast: true,
    mapCoords: [72.8777, 19.076],
  },
  {
    id: "delhi-2025",
    city: { en: "Delhi", hi: "दिल्ली" },
    country: "India",
    venue: "Akra, Lajpat Nagar",
    date: "2025-03-15",
    isPast: true,
    mapCoords: [77.1025, 28.7041],
  },
  {
    id: "indore-2027",
    city: { en: "Indore", hi: "इंदौर" },
    country: "India",
    venue: null,
    date: null,
    isPast: false,
    mapCoords: [75.8577, 22.7196],
  },
  {
    id: "hyderabad-2027",
    city: { en: "Hyderabad", hi: "हैदराबाद" },
    country: "India",
    venue: null,
    date: null,
    isPast: false,
    mapCoords: [78.4867, 17.385],
  },
  {
    id: "srinagar-2027",
    city: { en: "Srinagar", hi: "श्रीनगर" },
    country: "India",
    venue: null,
    date: null,
    isPast: false,
    mapCoords: [74.7973, 34.0837],
  },
  {
    id: "jaipur-2027",
    city: { en: "Jaipur", hi: "जयपुर" },
    country: "India",
    venue: null,
    date: null,
    isPast: false,
    mapCoords: [75.7873, 26.9124],
  },
  {
    id: "noida-2027",
    city: { en: "Noida", hi: "नोएडा" },
    country: "India",
    venue: null,
    date: null,
    isPast: false,
    mapCoords: [77.391, 28.5355],
  },
];
