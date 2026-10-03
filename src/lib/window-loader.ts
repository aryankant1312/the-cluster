/**
 * One second is long enough for the shared motion to register without making
 * a warm, cached window feel artificially slow.
 */
export const WINDOW_LOADER_MINIMUM_MS = 1000;

/**
 * Keep the lazy import API uniform at every window call site.
 *
 * Minimum display time now belongs to the persistent loader boundary, while
 * the dynamic fallback holds a readiness gate for exactly as long as the code
 * import takes. Keeping a second timer here made the fallback and the loaded
 * app exchange separate loader videos at the one-second mark.
 */
export function withWindowLoader<T>(loader: () => Promise<T>): Promise<T> {
  return loader();
}
