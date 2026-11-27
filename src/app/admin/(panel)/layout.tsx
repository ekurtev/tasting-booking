import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-session";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Администрация", template: "%s · Администрация" },
  robots: { index: false, follow: false },
};

// Every page under /admin (except /admin/login) is rendered only for a valid session.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Администрация">
        <Link href="/admin">График за деня</Link>
        <Link href="/admin/types">Дегустации</Link>
        <Link href="/admin/consultants">Консултанти</Link>
        <span className="admin-user">
          {admin.email} · <LogoutButton />
        </span>
      </nav>
      {children}
    </div>
  );
}
