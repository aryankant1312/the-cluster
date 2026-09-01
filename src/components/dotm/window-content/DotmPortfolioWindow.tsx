import { BrandUniverse } from "@/components/shared/BrandUniverse";

/**
 * DOTM-side brand universe. Shares every behaviour with the DEV view —
 * BrandUniverse reads the active persona from context and skins itself.
 */
export function DotmPortfolioWindow() {
  return <BrandUniverse />;
}

export default DotmPortfolioWindow;
