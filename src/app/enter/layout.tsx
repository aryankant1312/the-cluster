import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "https://dotm.in/enter" },
};

export default function EnterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
