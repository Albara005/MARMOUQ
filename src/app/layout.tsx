import type { Metadata, Viewport } from "next";
import { Reem_Kufi, IBM_Plex_Sans_Arabic, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const reem = Reem_Kufi({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-reem", display: "swap" });
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-plex", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "مرموق | MARMOUQ — أزياء رجالية راقية", template: "%s | مرموق MARMOUQ" },
  description: "طريقك لتكون شخصية مرموقة. ملابس رجالية راقية بتفاصيل مختارة بعناية: تريكو قطني إيطالي، قمصان رسمية، بناطيل وأحذية.",
  applicationName: "MARMOUQ",
  openGraph: { type: "website", locale: "ar_YE", siteName: "مرموق MARMOUQ" },
};

export const viewport: Viewport = {
  themeColor: "#1c130f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${reem.variable} ${plex.variable} ${cormorant.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
