"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="prose" role="alert">
      <h1 ref={heading} tabIndex={-1}>
        Нещо се обърка
      </h1>
      <p>
        Възникна неочаквана грешка. Моля, опитайте отново след малко. Ако проблемът продължава, можете да
        запазите дегустация по телефона - номерът е в долната част на страницата и на{" "}
        <Link href="/kontakti">страницата за контакти</Link>.
      </p>
      <p>
        <button type="button" className="btn" onClick={() => reset()}>
          Опитай отново
        </button>
      </p>
    </section>
  );
}
