import Image from "next/image";
import kaanPhod from "../../../../public/images/dev/recycle/kaan-phod.jpg";
import helpMe from "../../../../public/images/dev/recycle/help-me.png";
import scrapped from "../../../../public/images/dev/recycle/scrapped.png";
import dreamTeam from "../../../../public/images/dev/recycle/dream-team.png";

const DELETED_ITEMS = [
  { title: "Kaan phod", image: kaanPhod },
  { title: "Help me!", image: helpMe },
  { title: "Scrapped", image: scrapped },
  { title: "Dream team", image: dreamTeam },
];

export function RecycleBinWindow() {
  return (
    // Reading surface. See `.long-text` in globals.css.
    <div className="long-text grid grid-cols-2 gap-3 place-items-center py-2">
      {/* NO PLATE UNDER THE ARTWORK, matching `MusicTile` on this persona's
          other file surfaces. Each of these was wrapped in a raised
          `win98-border` on a white ground, which read as a sticker applied to
          a generic file icon rather than as the thing itself — and three of
          the four images carry their own light ground, so the two whites
          stacked into a slab with a picture printed on it.

          What is left is the treatment a track gets in My Music: bare art, a
          hairline edge and a drop shadow to lift it off the window without
          implying a surface beneath it. */}
      {DELETED_ITEMS.map((item) => (
        <div key={item.title} className="flex w-20 flex-col items-center gap-1 p-1.5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[2px] shadow-[1px_2px_4px_rgba(0,0,0,0.55)] ring-1 ring-black/60">
            <Image src={item.image} alt="" fill className="object-cover" sizes="56px" />
          </div>
          <span className="text-center text-[11px] leading-tight text-black">{item.title}</span>
        </div>
      ))}
    </div>
  );
}
