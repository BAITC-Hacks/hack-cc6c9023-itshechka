import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/lib/providers";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "HATTAMA AI", template: "%s · HATTAMA AI" },
  description: "Локальный ИИ-ассистент для протоколирования совещаний и контроля поручений",
  icons: { icon: "/hattama-logo.jpg" },
  openGraph: { images: ["/hattama-logo.jpg"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f7f7" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={manrope.className}>
        <a className="skip-link" href="#main-content">Перейти к содержимому</a>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}
