/**
 * SHOOT ON SIGHT — media from the places the work was shot.
 *
 * EMPTY ON PURPOSE, FOR NOW. The window, its two launchers and its layout
 * exist; the media does not yet. Adding entries here is the whole of filling
 * it — the window swaps its empty state for the real grid the moment this
 * array has something in it, with no other change anywhere.
 *
 * WHY A HAND-KEPT LIST RATHER THAN A GENERATED ONE. The Cluster Wall reads its
 * folder and derives everything, because a wall of clips needs nothing from a
 * human but the files. This does: a location's name, the city it sits in and
 * who held the camera are not recoverable from a filename, and inventing them
 * from one would be worse than leaving them out.
 *
 * GROUPING IS BY LOCATION and falls out of the data — every entry sharing a
 * `location` renders under one heading, in the order they first appear here.
 * There is no second list of locations to keep in step with this one.
 */

export interface ShootOnSightItem {
  /** Stable and arbitrary; only has to be unique within this list. */
  id: string;
  /** Path under `public/`, e.g. `/images/shoot-on-sight/lodhi-01.jpg`. */
  src: string;
  /** The heading this item files under. Entries sharing one are grouped. */
  location: string;
  city: string;
  /** ISO 8601, `YYYY-MM-DD` — the same shape dates take everywhere else here. */
  date: string;
  /** Who shot it. Empty when unknown: the line is dropped rather than faked. */
  credit: string;
  /** Optional. Falls back to the location name. */
  alt?: string;
}

/**
 * Add entries in this shape:
 *
 *   {
 *     id: "lodhi-01",
 *     src: "/images/shoot-on-sight/lodhi-01.jpg",
 *     location: "Lodhi Art District",
 *     city: "Delhi",
 *     date: "2025-06-21",
 *     credit: "@photographer",
 *   },
 */
export const shootOnSightItems: ShootOnSightItem[] = [];

export interface ShootLocation {
  location: string;
  city: string;
  /** The earliest date among this location's items. */
  date: string;
  items: ShootOnSightItem[];
}

/**
 * The list, grouped by location, in first-appearance order.
 *
 * A `Map` rather than an object keyed by name: integer-like object keys are
 * reordered by the runtime, so a location called "666" would quietly jump to
 * the front of the page.
 */
export function shootLocations(): ShootLocation[] {
  const groups = new Map<string, ShootLocation>();

  for (const item of shootOnSightItems) {
    const existing = groups.get(item.location);
    if (existing) {
      existing.items.push(item);
      if (item.date < existing.date) existing.date = item.date;
    } else {
      groups.set(item.location, {
        location: item.location,
        city: item.city,
        date: item.date,
        items: [item],
      });
    }
  }

  return [...groups.values()];
}
