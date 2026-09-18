import { readdir } from "node:fs/promises";
import path from "node:path";
import { brandCaseById } from "@/content/brand-cases";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

export interface BrandMediaAsset {
  name: string;
  src: string;
  type: "image" | "video";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await params;
  if (!brandCaseById(brandId)) {
    return Response.json({ assets: [] }, { status: 404 });
  }

  const directory = path.join(process.cwd(), "public", "brand-campaigns", brandId);

  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const assets: BrandMediaAsset[] = entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const extension = path.extname(entry.name).toLowerCase();
        const type = IMAGE_EXTENSIONS.has(extension)
          ? "image"
          : VIDEO_EXTENSIONS.has(extension)
            ? "video"
            : null;
        return type
          ? {
              name: entry.name,
              type,
              src: `/brand-campaigns/${encodeURIComponent(brandId)}/${encodeURIComponent(entry.name)}`,
            }
          : null;
      })
      .filter((asset): asset is BrandMediaAsset => asset !== null)
      .sort((a, b) => collator.compare(a.name, b.name));

    return Response.json(
      { assets },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return Response.json(
        { assets: [] },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    throw error;
  }
}
