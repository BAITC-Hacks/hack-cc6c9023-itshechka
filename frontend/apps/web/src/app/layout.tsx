import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/lib/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Хаттама", template: "%s · Хаттама" },
  description: "Локальный ИИ-ассистент для протоколирования совещаний и контроля поручений",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f7f7" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <a className="skip-link" href="#main-content">Перейти к содержимому</a>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}

