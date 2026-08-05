import type { Metadata } from "next";
import { VT323, IBM_Plex_Mono, Space_Mono, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { PersonaProvider } from "@/components/providers/PersonaProvider";
import { getLocaleFromCookie, getPersonaFromCookie } from "@/lib/session";
import "./globals.css";

const vt323 = VT323({ variable: "--font-vt323", weight: "400", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "THE CLUSTER — devilonthemic",
  description: "DOTM. Two faces. One cluster.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [persona, locale, messages] = await Promise.all([
    getPersonaFromCookie(),
    getLocaleFromCookie(),
    getMessages(),
  ]);

  return (
    <html
      lang={locale}
      data-persona={persona ?? "dev"}
      className={`${vt323.variable} ${plexMono.variable} ${spaceMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <PersonaProvider initialPersona={persona} initialLocale={locale}>
            {children}
          </PersonaProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
