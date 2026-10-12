import { getDisplayCurrency, getSettings, toPublicConfig } from "@/lib/settings";
import { listCategories, type CategoryData } from "@/lib/catalog";
import { StoreConfigProvider } from "@/components/store/store-provider";
import { CartProvider, WishlistProvider } from "@/components/store/cart/cart-provider";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { Header, type NavCategory } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";
import { RevealRoot } from "@/components/store/reveal";

/**
 * Storefront chrome shared by the (store) layout and the root not-found page:
 * providers, announcement bar, header, footer, cart drawer, floating contact and reveal root.
 */
export async function StoreShell({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const display = await getDisplayCurrency(settings);
  let categories: CategoryData[] = [];
  try {
    categories = await listCategories();
  } catch (err) {
    console.error("[store-shell] categories unavailable", err);
  }

  const nav: NavCategory[] = categories.map((c) => ({ slug: c.slug, name: c.name, nameEn: c.nameEn, image: c.image, productCount: c.productCount }));

  return (
    <StoreConfigProvider config={toPublicConfig(settings, display)}>
      <CartProvider>
        <WishlistProvider>
          <div className="flex min-h-dvh flex-col">
            <a
              href="#main"
              className="sr-only z-[70] rounded-full bg-espresso px-5 py-3 text-sm text-paper focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
            >
              تخطَّ إلى المحتوى
            </a>
            {settings.bars.announcement.enabled && (
              <AnnouncementBar
                messages={settings.announcements}
                tone={settings.bars.announcement.tone}
                href={settings.bars.announcement.href}
                interval={settings.bars.announcement.interval}
              />
            )}
            <Header categories={nav} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer
              info={{
                storeName: settings.storeName,
                storeNameEn: settings.storeNameEn,
                tagline: settings.tagline,
                description: settings.description,
                whatsapp: settings.whatsapp,
                phone: settings.phone,
                email: settings.email,
                instagram: settings.instagram,
                tiktok: settings.tiktok,
                workingHours: settings.workingHours,
                address: settings.address,
              }}
              categories={nav}
            />
          </div>
          <CartDrawer />
          <WhatsAppFab />
          <RevealRoot />
          <noscript>
            <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
          </noscript>
        </WishlistProvider>
      </CartProvider>
    </StoreConfigProvider>
  );
}
