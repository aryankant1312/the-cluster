import Image, { type StaticImageData } from "next/image";
import theBeginning from "../../../../public/images/covers/666-the-beginning.jpg";
import findingPeace from "../../../../public/images/covers/finding-peace.jpg";
import theTwoFaces from "../../../../public/images/covers/666-the-two-faces.jpg";
import spectrumSoon from "../../../../public/images/countdown/the-dotm-spectrum.png";

const RELEASES: Array<{ title: string; art?: StaticImageData }> = [
  { title: "It's OK" },
  { title: "666 – The Beginning", art: theBeginning },
  { title: "Finding Peace", art: findingPeace },
  { title: "666 – The Two Faces (upcoming)", art: theTwoFaces },
  { title: "The DOTM Spectrum (upcoming)", art: spectrumSoon },
  { title: "Singles" },
];

export function MyMusicWindow() {
  return (
    <div>
      <ul className="space-y-1">
        {RELEASES.map((release) => (
          <li
            key={release.title}
            className="win98-border bg-white/90 flex items-center gap-2 px-2 py-1 text-black"
          >
            {release.art ? (
              <div className="relative w-8 h-8 shrink-0 overflow-hidden">
                <Image src={release.art} alt="" fill className="object-cover" sizes="32px" />
              </div>
            ) : (
              <div className="w-8 h-8 shrink-0 bg-persona-surface-alt border border-black/30" />
            )}
            <span>{release.title}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-muted">
        FULL DISCOGRAPHY MIND MAP — COMING SOON.
      </p>
    </div>
  );
}
