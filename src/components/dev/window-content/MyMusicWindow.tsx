import { folders, myMusicEntries, trackArtwork, tracks, trackIndexById } from "@/content/tracks";
// The keyed PNG, not the delivered JPEG. A JPEG cannot carry alpha, so the
// artwork's white card came with it and needed a white plate to hide against.
import folderIcon from "../../../../public/images/dev/music/folder-icon.png";
import { MusicTile } from "./MusicTile";

export function MyMusicWindow({
  onSelectTrack,
  onOpenFolder,
}: {
  onSelectTrack: (index: number) => void;
  onOpenFolder: (folderId: string) => void;
}) {
  /**
   * FOLDERS FIRST, THEN THE LOOSE TRACKS.
   *
   * `myMusicEntries` is authored singles-then-folders, so the four records sat
   * at the bottom of the grid — below whatever the window's height happened to
   * cut off — and the window opened on a field of singles with no sign that
   * the albums they came from were in here too. Every file manager this one is
   * dressed as puts containers above their contents, and for the same reason:
   * a folder is a place you might go, a track is a thing you play, and the
   * places belong at the top.
   *
   * Sorted here rather than reordered in `content/tracks.ts`: that array is the
   * catalogue's own order. `slice()` first, because `sort` mutates and this is
   * a module-level import. The comparator only distinguishes folder from
   * track, and `Array.prototype.sort` is stable, so within each group the
   * authored order survives untouched.
   */
  const entries = myMusicEntries
    .slice()
    .sort((a, b) => Number(b.type === "folder") - Number(a.type === "folder"));

  return (
    <div className="grid grid-cols-3 gap-3 place-items-center py-1">
      {entries.map((entry) => {
        if (entry.type === "track") {
          const index = trackIndexById(entry.trackId);
          const t = tracks[index];
          return (
            <MusicTile
              key={t.id}
              icon={trackArtwork(t)}
              label={t.title}
              onOpen={() => onSelectTrack(index)}
            />
          );
        }
        const folder = folders.find((f) => f.id === entry.folderId);
        if (!folder) return null;
        return (
          <MusicTile
            key={folder.id}
            icon={folderIcon}
            label={folder.title}
            variant="folder"
            onOpen={() => onOpenFolder(folder.id)}
          />
        );
      })}
    </div>
  );
}
