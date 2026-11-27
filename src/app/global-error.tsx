"use client";

import Link from "next/link";

// Last-resort error page when the root layout itself fails (no CSS, no footer).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="bg">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, color: "#2b2118", background: "#fdf8f3" }}>
        <main>
          <h1>Нещо се обърка</h1>
          <p>Сайтът временно не е достъпен. Моля, опитайте отново след малко.</p>
          <button type="button" onClick={() => reset()}>
            Опитай отново
          </button>{" "}
          <Link href="/">Към началото</Link>
        </main>
      </body>
    </html>
  );
}
