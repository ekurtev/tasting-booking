"use client";

import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="link-btn"
      onClick={async () => {
        await adminFetch("/api/admin/logout", "POST");
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Изход
    </button>
  );
}
