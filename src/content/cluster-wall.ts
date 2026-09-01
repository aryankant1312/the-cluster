import type { MasonryItem } from "@/components/shared/MasonryGallery";

/**
 * Cluster Wall gallery tiles. `height` is an aspect indicator (400 × imgH/imgW)
 * so the masonry keeps each image's real proportions. Images live in
 * public/images/cluster-wall/ (downscaled web copies of the source art).
 */
export const clusterWallItems: MasonryItem[] = [
  { id: "kuvvet-1", img: "/images/cluster-wall/kuvvet-1.jpg", height: 267, title: "Kuvvet" },
  { id: "kuvvet-2", img: "/images/cluster-wall/kuvvet-2.jpg", height: 267, title: "Kuvvet II" },
  { id: "finding-peace", img: "/images/cluster-wall/finding-peace.jpg", height: 225, title: "Finding Peace" },
  { id: "lts-1", img: "/images/cluster-wall/lts-1.png", height: 400, title: "LTS" },
  { id: "lts-2", img: "/images/cluster-wall/lts-2.png", height: 399, title: "LTS II" },
  { id: "studio", img: "/images/cluster-wall/studio.png", height: 401, title: "Studio" },
  { id: "track-list", img: "/images/cluster-wall/track-list.png", height: 200, title: "Track List" },
];
