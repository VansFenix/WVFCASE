import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "WVFCASE — Твой кейс. Твои правила.",
  description: "Бесплатный симулятор открытия кейсов CS2. 54 кейса, анимации, апгрейды, контракты и твоя личная коллекция. Без депозитов и реальных ставок.",
  applicationName: "WVFCASE",
  icons: { icon: "/icon.svg" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0c0d11", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
