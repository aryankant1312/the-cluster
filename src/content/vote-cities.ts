import type { VoteCity } from "./types";

/**
 * Display order is intentionally not sorted by vote count - the fill level
 * (derived from `votes`) is what carries the ranking signal, not position.
 */
export const voteCities: VoteCity[] = [
  { id: "noida", name: "Noida", votes: 62 },
  { id: "jaipur", name: "Jaipur", votes: 212 },
  { id: "bandra", name: "Bandra", votes: 44 },
  { id: "hyderabad", name: "Hyderabad", votes: 156 },
  { id: "srinagar", name: "Srinagar", votes: 81 },
  { id: "indore", name: "Indore", votes: 134 },
  { id: "goa", name: "Goa", votes: 178 },
  { id: "ahmedabad", name: "Ahmedabad", votes: 97 },
];
