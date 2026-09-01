import { folders, trackArtwork, tracks, trackIndexById } from "@/content/tracks";
import { MusicTile } from "./MusicTile";

export function FolderWindow({
  folderId,
  onSelectTrack,
}: {
  folderId: string;
  onSelectTrack: (index: number) => void;
}) {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return null;

  return (
    <div className="grid grid-cols-3 gap-3 place-items-center py-1">
      {folder.trackIds.map((trackId) => {
        const index = trackIndexById(trackId);
        const t = tracks[index];
        return (
          <MusicTile
            key={t.id}
            icon={trackArtwork(t)}
            label={t.title}
            onOpen={() => onSelectTrack(index)}
          />
        );
      })}
    </div>
  );
}
