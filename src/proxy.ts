import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tb_admin_session";

/**
 * First line of defence for the admin area: requests without a session cookie never reach admin
 * pages or the admin API. This is only an optimistic check — every admin page (layout) and every
 * /api/admin/* handler verifies the session against the database itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAdminPath = pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isPublicAdminPath || request.cookies.has(SESSION_COOKIE)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "unauthorized", message: "Необходим е вход." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin", "/api/admin/:path*"],
};
