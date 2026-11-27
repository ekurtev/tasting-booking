import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Сладка кутия: дегустации", template: "%s · Сладка кутия" },
  description: "Запазете дегустация на нашите абонаментни кутии онлайн — в София и Бургас.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#b4462e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="logo">
              Сладка <span>кутия</span>
            </Link>
            <Link href="/book" className="btn" style={{ minHeight: 40, padding: "0 16px" }}>
              Запази час
            </Link>
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">© Сладка кутия · Дегустации в София и Бургас</div>
        </footer>
      </body>
    </html>
  );
}
