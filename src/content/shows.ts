import type { Show } from "./types";

/**
 * Venue names, coordinates, and Maps links resolved from the Google Maps
 * links DOTM shared directly (each pin below matches the exact venue, not a
 * generic city-center approximation).
 */
export const shows: Show[] = [
  {
    id: "goa-2024",
    city: { en: "Goa", hi: "गोवा" },
    country: "India",
    venue: "Ricky's Pool Club by Titos",
    date: "2024-03-25",
    isPast: true,
    mapCoords: [73.7527073, 15.5560015],
    mapsUrl: "https://maps.app.goo.gl/cmcN8BWJzKiUhdNG9",
    instagramUrl: "https://www.instagram.com/p/DDAwwoYTiol/?hl=en&img_index=1",
  },
  {
    id: "bangalore-2024",
    city: { en: "Bangalore", hi: "बैंगलोर" },
    country: "India",
    venue: "We:Neighborhood",
    date: "2024-07-13",
    isPast: true,
    mapCoords: [77.6082541, 12.9724248],
    mapsUrl: "https://maps.app.goo.gl/MJqNvfkDBLFkUGu38",
    instagramUrl: "https://www.instagram.com/reel/DCeIarQsTtu/?hl=en",
  },
  {
    id: "mumbai-2024",
    city: { en: "Mumbai", hi: "मुंबई" },
    country: "India",
    venue: "antiSOCIAL Lower Parel",
    date: "2024-10-11",
    isPast: true,
    mapCoords: [72.8303041, 18.9992337],
    mapsUrl: "https://maps.app.goo.gl/pSts3JL1mouMvwhi9",
    instagramUrl: "https://www.instagram.com/reel/DCKDyfoMwLt/?hl=en",
  },
  {
    id: "delhi-2025",
    city: { en: "Delhi", hi: "दिल्ली" },
    country: "India",
    venue: "Akra, Lajpat Nagar",
    date: "2025-03-15",
    isPast: true,
    mapCoords: [77.2361209, 28.5693911],
    mapsUrl: "https://maps.app.goo.gl/pg3WTGHUL2L8ystk9",
    instagramUrl: "https://www.instagram.com/reel/DDl_PsDzfV-/?hl=en",
  },
  {
    id: "delhi-2-2025",
    city: { en: "Delhi", hi: "दिल्ली" },
    country: "India",
    venue: "Bira 91 Taproom, Saket",
    date: null,
    isPast: true,
    mapCoords: [77.2158665, 28.5285022],
    mapsUrl: "https://maps.app.goo.gl/XVYRweVP3BCzZmLq7",
    instagramUrl: null,
  },

  /* ── UPCOMING ─────────────────────────────────────────────────────────
     EVERY ONE OF THESE FOUR IS A PLACEHOLDER. Read this before launch.

     They exist so the Next City panel has four real tiles to lay out rather
     than an empty state, and the cities are taken from the vote board so the
     two halves of that screen are about the same tour. The venues and the
     dates are invented and the coordinates are city-centre approximations,
     not the pin for a booked room.

     `ticketsUrl: null` is what keeps that honest on the live site: the
     button renders with its label and renders disabled, so nothing here
     announces a show anyone can buy into. Replacing a null with a real link
     is the whole of putting one of these on sale.

     `isPast: false` keeps all four out of the past list, the stop count and
     the map, every one of which filters on it. */
  {
    id: "jaipur-upcoming",
    city: { en: "Jaipur", hi: "जयपुर" },
    country: "India",
    venue: "Venue TBA",
    date: "2026-10-17",
    isPast: false,
    mapCoords: [75.7873, 26.9124],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Jaipur",
    instagramUrl: null,
    ticketsUrl: null,
  },
  {
    id: "hyderabad-upcoming",
    city: { en: "Hyderabad", hi: "हैदराबाद" },
    country: "India",
    venue: "Venue TBA",
    date: "2026-11-07",
    isPast: false,
    mapCoords: [78.4867, 17.385],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hyderabad",
    instagramUrl: null,
    ticketsUrl: null,
  },
  {
    id: "indore-upcoming",
    city: { en: "Indore", hi: "इंदौर" },
    country: "India",
    venue: "Venue TBA",
    date: "2026-11-28",
    isPast: false,
    mapCoords: [75.8577, 22.7196],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Indore",
    instagramUrl: null,
    ticketsUrl: null,
  },
  {
    id: "goa-upcoming",
    city: { en: "Goa", hi: "गोवा" },
    country: "India",
    venue: "Venue TBA",
    date: "2026-12-19",
    isPast: false,
    mapCoords: [73.8567, 15.2993],
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Goa",
    instagramUrl: null,
    ticketsUrl: null,
  },
];

/**
 * The shows still to come, in date order.
 *
 * Derived rather than kept as a second array, so a show cannot be in both
 * lists or fall out of both when its `isPast` flips.
 */
export const upcomingShows: Show[] = shows
  .filter((s) => !s.isPast)
  .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
