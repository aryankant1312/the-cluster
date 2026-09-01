// GENERATED FILE — DO NOT EDIT.
//
// Written by `scripts/build-cluster-wall.mjs`, which runs on `predev` and
// `prebuild`. To change the wall, change the contents of
// `public/images/cluster-wall/` — every file in there that a browser can
// render becomes a tile, at its own proportions, in filename order.

export interface ClusterWallTile {
  id: string;
  src: string;
  title: string;
  /** Intrinsic pixel size, read from the file header. Drives the masonry. */
  width: number;
  height: number;
  /** `video` tiles loop muted like a GIF and can be unmuted; images cannot. */
  kind: "image" | "video";
  /** True only for a clip carrying a real sound track. Gates the speaker. */
  hasAudio: boolean;
}

export const clusterWallTiles: ClusterWallTile[] = [
  { id: "2623d941-7e6d-44f6-974e-b39874aae580", src: "/images/cluster-wall/2623d941-7e6d-44f6-974e-b39874aae580.jpg", title: "2623d941 7e6d 44f6 974e B39874aae580", width: 1050, height: 1400, kind: "image", hasAudio: false },
  { id: "938bf1b6-fe8b-49af-a4c7-98c792009783", src: "/images/cluster-wall/938bf1b6-fe8b-49af-a4c7-98c792009783.jpg", title: "938bf1b6 Fe8b 49af A4c7 98c792009783", width: 1050, height: 1400, kind: "image", hasAudio: false },
  { id: "aryanfitcheck", src: "/images/cluster-wall/aryanfitcheck.mp4", title: "Aryanfitcheck", width: 720, height: 1280, kind: "video", hasAudio: true },
  { id: "bhala-kyun-meme", src: "/images/cluster-wall/bhala-kyun-meme.mp4", title: "Bhala Kyun Meme", width: 720, height: 1280, kind: "video", hasAudio: true },
  { id: "cluster-check", src: "/images/cluster-wall/cluster-check.mp4", title: "Cluster Check", width: 720, height: 1280, kind: "video", hasAudio: true },
  { id: "credits-kuvvet-6", src: "/images/cluster-wall/credits-kuvvet-6.jpg", title: "Credits Kuvvet 6", width: 1400, height: 933, kind: "image", hasAudio: false },
  { id: "finding-peace-bg", src: "/images/cluster-wall/finding-peace-bg.jpg", title: "Finding Peace Bg", width: 1400, height: 788, kind: "image", hasAudio: false },
  { id: "gaana", src: "/images/cluster-wall/gaana.mp4", title: "Gaana", width: 722, height: 406, kind: "video", hasAudio: true },
  { id: "gaddirokohoscenecahange", src: "/images/cluster-wall/gaddirokohoscenecahange.mp4", title: "Gaddirokohoscenecahange", width: 720, height: 1214, kind: "video", hasAudio: true },
  { id: "howdeepcanyousing", src: "/images/cluster-wall/howdeepcanyousing.mp4", title: "Howdeepcanyousing", width: 722, height: 406, kind: "video", hasAudio: true },
  { id: "img-5167", src: "/images/cluster-wall/img-5167.jpg", title: "Img 5167", width: 1400, height: 1050, kind: "image", hasAudio: false },
  { id: "img-6050", src: "/images/cluster-wall/img-6050.jpg", title: "Img 6050", width: 1400, height: 1050, kind: "image", hasAudio: false },
  { id: "impressive", src: "/images/cluster-wall/impressive.mp4", title: "Impressive", width: 720, height: 1280, kind: "video", hasAudio: true },
  { id: "khuddukhi", src: "/images/cluster-wall/khuddukhi.mp4", title: "Khuddukhi", width: 720, height: 1280, kind: "video", hasAudio: true },
  { id: "lts-1", src: "/images/cluster-wall/lts-1.jpg", title: "Lts 1", width: 1000, height: 1000, kind: "image", hasAudio: false },
  { id: "lts-3", src: "/images/cluster-wall/lts-3.jpg", title: "Lts 3", width: 1002, height: 1000, kind: "image", hasAudio: false },
  { id: "pxl-20250224-114841212-1", src: "/images/cluster-wall/pxl-20250224-114841212-1.mp4", title: "Pxl 20250224 114841212 1", width: 720, height: 720, kind: "video", hasAudio: true },
  { id: "pxl-20250224-114841212-2", src: "/images/cluster-wall/pxl-20250224-114841212-2.mp4", title: "Pxl 20250224 114841212 2", width: 720, height: 720, kind: "video", hasAudio: true },
  { id: "pxl-20250224-114841212-3", src: "/images/cluster-wall/pxl-20250224-114841212-3.mp4", title: "Pxl 20250224 114841212 3", width: 722, height: 406, kind: "video", hasAudio: true },
  { id: "pxl-20250224-114841212-4", src: "/images/cluster-wall/pxl-20250224-114841212-4.mp4", title: "Pxl 20250224 114841212 4", width: 722, height: 406, kind: "video", hasAudio: true },
  { id: "screenshot-2025-02-07-052548", src: "/images/cluster-wall/screenshot-2025-02-07-052548.jpg", title: "Screenshot 2025 02 07 052548", width: 636, height: 637, kind: "image", hasAudio: false },
  { id: "thakthakohoscenechange", src: "/images/cluster-wall/thakthakohoscenechange.mp4", title: "Thakthakohoscenechange", width: 720, height: 480, kind: "video", hasAudio: true },
  { id: "winnie-pooh-bts", src: "/images/cluster-wall/winnie-pooh-bts.mp4", title: "Winnie Pooh Bts", width: 720, height: 1280, kind: "video", hasAudio: true },
];
