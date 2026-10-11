import Link from "next/link";
import { Banknote, Clock, Landmark, Mail, Phone, Wallet } from "lucide-react";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { SERVICE_LINKS, categoryHref, instagramHandle } from "@/components/store/nav";
import { whatsappLink } from "@/lib/utils";

export type FooterInfo = {
  storeName: string;
  storeNameEn: string;
  tagline: string;
  description: string;
  whatsapp: string;
  phone: string;
  email: string;
  instagram: string;
  tiktok: string;
  workingHours: string;
  address: string;
};

export function Footer({ info, categories }: { info: FooterInfo; categories: { slug: string; name: string }[] }) {
  const year = new Date().getFullYear();
  const linkCls = "link-luxe inline-flex min-h-9 items-center py-1 text-[0.92rem] text-paper/70 transition-colors hover:text-paper";

  return (
    <footer className="mt-auto">
      {/* VIP list */}
      <section aria-labelledby="vip-title" className="border-t border-line bg-bone">
        <div className="container-luxe grid items-center gap-8 py-14 md:grid-cols-12 md:gap-12 md:py-20">
          <div className="md:col-span-6">
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gold/70" aria-hidden />
              The Private List
            </p>
            <h2 id="vip-title" className="display mt-4 text-3xl leading-tight text-espresso text-balance md:text-[2.75rem]">
              انضم لقائمة مرموق الخاصة
            </h2>
            <p className="mt-3 max-w-md text-[0.95rem] leading-8 text-umber">كن أول من يعرف بالمجموعات الجديدة والقطع المحدودة قبل نزولها على إنستغرام.</p>
          </div>
          <div className="md:col-span-6 md:ps-8 lg:ps-16">
            <NewsletterForm />
          </div>
        </div>
      </section>

      <div className="relative isolate overflow-hidden bg-espresso text-paper grain">
        <div className="container-luxe pt-16 md:pt-24">
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            {/* Brand */}
            <div className="md:col-span-4">
              <p className="display text-2xl text-paper">{info.storeName}</p>
              <p className="mt-1 latin-italic text-lg text-copper-soft">{info.tagline}</p>
              <p className="mt-5 max-w-sm text-sm leading-7 text-paper/60">{info.description}</p>
              <div className="mt-6 flex items-center gap-1 -ms-2.5">
                {info.instagram && (
                  <a href={info.instagram} target="_blank" rel="noopener noreferrer" aria-label={`إنستغرام ${instagramHandle(info.instagram)}`} className="grid size-11 place-items-center rounded-full text-paper/75 transition-colors hover:bg-paper/10 hover:text-paper">
                    <InstagramIcon size={20} />
                  </a>
                )}
                {info.tiktok && (
                  <a href={info.tiktok} target="_blank" rel="noopener noreferrer" aria-label="تيك توك" className="grid size-11 place-items-center rounded-full text-paper/75 transition-colors hover:bg-paper/10 hover:text-paper">
                    <TikTokIcon size={19} />
                  </a>
                )}
                {info.whatsapp && (
                  <a href={whatsappLink(info.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="واتساب" className="grid size-11 place-items-center rounded-full text-paper/75 transition-colors hover:bg-paper/10 hover:text-paper">
                    <WhatsAppIcon size={19} />
                  </a>
                )}
              </div>
            </div>

            {/* Columns */}
            <nav aria-label="روابط التذييل" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:col-span-8">
              <div>
                <h2 className="text-[0.8rem] font-medium text-copper-soft">تسوّق</h2>
                <ul className="mt-5 space-y-1">
                  <li>
                    <Link href="/shop" className={linkCls}>
                      كل القطع
                    </Link>
                  </li>
                  {categories.slice(0, 6).map((c) => (
                    <li key={c.slug}>
                      <Link href={categoryHref(c.slug)} className={linkCls}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/shop?sort=newest" className={linkCls}>
                      وصل حديثاً
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="text-[0.8rem] font-medium text-copper-soft">خدمة العملاء</h2>
                <ul className="mt-5 space-y-1">
                  {SERVICE_LINKS.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={linkCls}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <h2 className="text-[0.8rem] font-medium text-copper-soft">عن مرموق</h2>
                <ul className="mt-5 space-y-1">
                  {[
                    { href: "/about", label: "قصتنا" },
                    { href: "/looks", label: "الإطلالات" },
                    { href: "/atelier", label: "منسّق الإطلالة" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={linkCls}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="mt-6 space-y-2.5 text-sm text-paper/60">
                  {info.workingHours && (
                    <li className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 size-4 shrink-0 text-copper-soft" strokeWidth={1.5} aria-hidden />
                      {info.workingHours}
                    </li>
                  )}
                  {info.phone && (
                    <li>
                      <a href={`tel:${info.phone}`} className="flex items-center gap-2.5 hover:text-paper">
                        <Phone className="size-4 shrink-0 text-copper-soft" strokeWidth={1.5} aria-hidden />
                        <span className="tabular-nums" dir="ltr">{info.phone}</span>
                      </a>
                    </li>
                  )}
                  {info.email && (
                    <li>
                      <a href={`mailto:${info.email}`} className="flex items-center gap-2.5 hover:text-paper">
                        <Mail className="size-4 shrink-0 text-copper-soft" strokeWidth={1.5} aria-hidden />
                        {info.email}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </nav>
          </div>

          {/* Payments */}
          <div className="mt-14 flex flex-col gap-4 border-t border-paper/10 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-paper/50">طرق دفع مرنة تناسبك</p>
            <ul className="flex flex-wrap gap-2" aria-label="طرق الدفع المتاحة">
              {[
                { icon: Banknote, label: "الدفع عند الاستلام" },
                { icon: Landmark, label: "الكريمي" },
                { icon: Wallet, label: "المحافظ الإلكترونية" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex h-9 items-center gap-2 rounded-full border border-paper/15 px-3.5 text-xs text-paper/80">
                  <Icon className="size-3.5 text-copper-soft" strokeWidth={1.5} aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Monumental wordmark */}
        <div className="pointer-events-none mt-10 select-none overflow-hidden" aria-hidden>
          <p
            dir="ltr"
            className="whitespace-nowrap text-center font-[family-name:var(--font-latin)] text-[18.5vw] font-semibold leading-[0.78] tracking-[0.06em] text-transparent [-webkit-text-stroke:1px_rgba(217,165,126,0.28)] md:text-[17vw]"
          >
            {info.storeNameEn || "MARMOUQ"}
          </p>
        </div>

        <div className="relative border-t border-paper/10 bg-espresso/60">
          <div className="container-luxe flex flex-col items-center justify-between gap-2 py-5 text-[0.72rem] text-paper/50 md:flex-row">
            <p>
              © {year} {info.storeName} {info.storeNameEn}. جميع الحقوق محفوظة.
            </p>
            <p className="inline-flex items-center gap-2">
              <span className="text-gold" aria-hidden>
                ✦
              </span>
              صُنع بعناية في اليمن
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
