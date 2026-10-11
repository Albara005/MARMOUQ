import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse gate for the admin area: bounce visitors without a session cookie to the login page.
 * Real verification (signature, expiry, active admin, role) happens in `requireAdmin()` on every page and action.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !request.cookies.has("mrq_admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
