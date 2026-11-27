import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { LogoMark } from "@/components/icons";
import { company } from "@/content/company";
import "./globals.css";

// Lora (SIL OFL 1.1), self-hosted from the @fontsource-variable/lora package: served from our own
// origin under /_next/static/media, so the CSP (font-src 'self') stays unchanged. Headings only.
const loraCyrillic = localFont({
  src: "../../node_modules/@fontsource-variable/lora/files/lora-cyrillic-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-lora-cyr",
  display: "swap",
  fallback: ["Georgia", "serif"],
});
const loraLatin = localFont({
  src: "../../node_modules/@fontsource-variable/lora/files/lora-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-lora-lat",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
});

const description = "Запазете дегустация на нашите абонаментни сладки кутии онлайн - в София и Бургас.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "Сладка кутия: дегустации", template: "%s · Сладка кутия" },
  description,
  openGraph: {
    type: "website",
    locale: "bg_BG",
    siteName: company.brand,
    title: "Сладка кутия: дегустации",
    description,
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#b4462e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={`${loraCyrillic.variable} ${loraLatin.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Към съдържанието
        </a>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="logo" aria-label="Сладка кутия, начало">
              <LogoMark />
              <span className="logo-text">
                Сладка <span>кутия</span>
              </span>
            </Link>
            <nav aria-label="Основна навигация" className="main-nav">
              <Link href="/kak-raboti">Как работи</Link>
              <Link href="/za-nas">За нас</Link>
              <Link href="/kontakti">Контакти</Link>
              <Link href="/book" className="btn btn-nav">
                Запази час
              </Link>
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="container">{children}</div>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
