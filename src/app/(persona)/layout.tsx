import { PersonaTopBar } from "@/components/chrome/PersonaTopBar";
import { MobileGate } from "@/components/chrome/MobileGate";

export default function PersonaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <MobileGate />
      <PersonaTopBar />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
