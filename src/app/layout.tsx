import type { Metadata, Viewport } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { company } from "@/content/company";
import "./globals.css";

const description = "Запазете дегустация на нашите абонаментни сладки кутии онлайн — в София и Бургас.";

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
    <html lang="bg">
      <body>
        <a href="#main" className="skip-link">
          Към съдържанието
        </a>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="logo" aria-label="Сладка кутия — начало">
              Сладка <span>кутия</span>
            </Link>
            <nav aria-label="Основна навигация" className="main-nav">
              <Link href="/kak-raboti">Как работи</Link>
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
