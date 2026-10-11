/** Storefront navigation constants — plain module, safe for server and client components. */

/** Single source of truth for category URLs across the shell and home page. */
export function categoryHref(slug: string): string {
  return `/shop?category=${encodeURIComponent(slug)}`;
}

export const NAV_LINKS = [
  { href: "/looks", label: "الإطلالات" },
  { href: "/atelier", label: "منسّق الإطلالة" },
  { href: "/about", label: "قصتنا" },
] as const;

export const SERVICE_LINKS = [
  { href: "/track", label: "تتبّع طلبك" },
  { href: "/policies/shipping", label: "الشحن والتوصيل" },
  { href: "/policies/returns", label: "الاستبدال والإرجاع" },
  { href: "/contact", label: "تواصل معنا" },
] as const;

/** "@marmouq.ye" from an Instagram profile URL. */
export function instagramHandle(url: string): string {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : "@marmouq.ye";
}
