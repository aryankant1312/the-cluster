import Image, { type StaticImageData } from "next/image";
import nothingLogo from "../../../../public/images/brands/nothing-cmf-logo.png";
import saregamaLogo from "../../../../public/images/brands/saregama.png";
import dndTrip from "../../../../public/images/covers/dnd-trip.jpg";
import bhalaKyun from "../../../../public/images/covers/bhala-kyun.png";
import gaddiRok from "../../../../public/images/covers/gaddi-rok.jpg";
import badside from "../../../../public/images/covers/badside.jpg";
import noBlessings from "../../../../public/images/covers/no-blessings.jpg";
import selfishLog from "../../../../public/images/covers/selfish-log.jpg";
import usBhaiUs from "../../../../public/images/covers/us-bhai-us.jpg";
import findingPeace from "../../../../public/images/covers/finding-peace.jpg";
import theBeginning from "../../../../public/images/covers/666-the-beginning.jpg";
import theTwoFaces from "../../../../public/images/covers/666-the-two-faces.jpg";

interface Collab {
  name: string;
  logo?: StaticImageData;
}

const COLLABS: Collab[] = [
  { name: "Nothing — CMF Pro 2", logo: nothingLogo },
  { name: "Hero — Xtreme 160R" },
  { name: "Roulette" },
  { name: "TuneCore" },
  { name: "Saregama", logo: saregamaLogo },
  { name: "MTV / Jio Hotstar" },
];

const ALBUM_ART: Array<{ title: string; art: StaticImageData }> = [
  { title: "DND Trip", art: dndTrip },
  { title: "Gaddi Rok", art: gaddiRok },
  { title: "Badside", art: badside },
  { title: "Us Bhai Us", art: usBhaiUs },
  { title: "No Blessings", art: noBlessings },
  { title: "Selfish Log", art: selfishLog },
  { title: "Bhala Kyun", art: bhalaKyun },
  { title: "666 – The Beginning", art: theBeginning },
  { title: "666 – The Two Faces", art: theTwoFaces },
];

export function PortfolioWindow() {
  return (
    <div>
      <p className="font-chrome text-sm mb-2 tracking-wide">
        HUSTLE 4 — MTV × JIO HOTSTAR × SAREGAMA
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {COLLABS.map((collab) => (
          <div
            key={collab.name}
            className="win98-border bg-white/90 flex flex-col items-center justify-center gap-1 p-2 h-20 text-center"
          >
            {collab.logo ? (
              <Image src={collab.logo} alt="" className="max-h-8 w-auto object-contain" />
            ) : (
              <span className="text-[10px] text-black leading-tight">{collab.name}</span>
            )}
          </div>
        ))}
      </div>

      <p className="font-chrome text-sm mb-2 tracking-wide">ALBUM ARTS</p>
      <div className="grid grid-cols-3 gap-2">
        {ALBUM_ART.map((item) => (
          <div key={item.title} className="win98-border bg-white/90 overflow-hidden">
            <div className="relative aspect-square">
              <Image src={item.art} alt={item.title} fill className="object-cover" sizes="120px" />
            </div>
            <p className="text-[10px] text-black text-center px-1 py-0.5 truncate">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
