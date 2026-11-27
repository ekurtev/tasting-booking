import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>Страницата не е намерена</h1>
      <p>Възможно е линкът да е грешен или резервацията да не съществува.</p>
      <Link href="/" className="btn">
        Към началото
      </Link>
    </>
  );
}
