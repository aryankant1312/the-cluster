/**
 * DROPS — merch as artifacts rather than a catalogue.
 *
 * Each collection is a numbered drop with a story, a fixed run and a claimed
 * counter, so the page reads like a release rather than a shop. Everything
 * here is placeholder until real product data arrives; `image: null` renders
 * a styled placeholder instead of a broken asset.
 */

export type DropStatus = "live" | "upcoming" | "sold_out";

export interface Product {
  id: string;
  name: string;
  /** Whole rupees. Formatting happens at the edge. */
  priceInr: number;
  /** Path under public/, or null while artwork is pending. */
  image: string | null;
  sizes: string[];
  description: string;
}

export interface Drop {
  id: string;
  /** Zero-padded, e.g. "001". */
  number: string;
  name: string;
  subtitle: string;
  story: string[];
  totalPieces: number;
  claimedPieces: number;
  status: DropStatus;
  /** `YYYY-MM-DD`, or empty while unconfirmed. */
  releaseDate: string;
  products: Product[];
}

export const drops: Drop[] = [
  {
    id: "drop-001",
    number: "001",
    name: "THERAPY",
    subtitle: "Session one",
    story: [
      "The first drop takes its name from the record that started the catalogue as a body of work rather than a run of singles.",
      "One hundred pieces. Numbered. When they're gone the run closes and does not reopen.",
    ],
    totalPieces: 100,
    claimedPieces: 92,
    status: "live",
    releaseDate: "",
    products: [
      {
        id: "therapy-tee",
        name: "Therapy Tee",
        priceInr: 1499,
        image: null,
        sizes: ["S", "M", "L", "XL", "XXL"],
        description: "Heavyweight cotton, screen-printed front and back.",
      },
      {
        id: "therapy-hoodie",
        name: "Therapy Hoodie",
        priceInr: 3299,
        image: null,
        sizes: ["S", "M", "L", "XL"],
        description: "Oversized fit, embroidered mark.",
      },
    ],
  },
  {
    id: "drop-002",
    number: "002",
    name: "FINDING PEACE",
    subtitle: "Session two",
    story: ["Built around the Finding Peace record. Quieter palette, same weight."],
    totalPieces: 150,
    claimedPieces: 0,
    status: "upcoming",
    releaseDate: "",
    products: [
      {
        id: "peace-tee",
        name: "Finding Peace Tee",
        priceInr: 1499,
        image: null,
        sizes: ["S", "M", "L", "XL", "XXL"],
        description: "Heavyweight cotton, tonal print.",
      },
    ],
  },
];

export function formatInr(rupees: number): string {
  return "₹" + rupees.toLocaleString("en-IN");
}

export function dropById(id: string): Drop | undefined {
  return drops.find((d) => d.id === id);
}
