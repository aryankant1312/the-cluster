import { BrandUniverse } from "@/components/shared/BrandUniverse";

/**
 * DEV-side brand universe. The belt, the case studies and the persona
 * styling all live in BrandUniverse so this view and the DOTM one cannot
 * drift apart.
 */
export function PortfolioWindow() {
  return <BrandUniverse />;
}

export default PortfolioWindow;
