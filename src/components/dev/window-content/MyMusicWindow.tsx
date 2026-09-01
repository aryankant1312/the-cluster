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
  return (
    <div className="grid grid-cols-3 gap-3 place-items-center py-1">
      {myMusicEntries.map((entry) => {
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
