import type { Track } from "@/content/tracks";

/**
 * Single seam for track playback. Today it reads a local file path;
 * swapping in Spotify previews or a different CDN later is a one-line change.
 */
export function getAudioSource(track: Track): string | null {
  return track.audioSrc;
}
