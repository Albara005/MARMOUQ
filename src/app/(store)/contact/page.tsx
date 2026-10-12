import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  Clock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
} from "lucide-react";
import { getDisplayCurrency, getSettings } from "@/lib/settings";
import { listShippingZones } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { whatsappLink, cn } from "@/lib/utils";
import { PageHeader } from "@/components/store/page-header";
import {
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/ui/brand-icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description:
    "تواصل مع فريق مرموق عبر واتساب أو إنستغرام — نساعدك في المقاس والتنسيق ونتابع طلبك حتى يوصل بابك.",
  alternates: { canonical: "/contact" },
};

const handleOf = (url: string) => {
  const seg = url.replace(/\/+$/, "").split("/").pop() ?? "";
  return seg ? (seg.startsWith("@") ? seg : `@${seg}`) : url;
};

type Card = {
  key: string;
  latin: string;
  label: string;
  value: string;
  ltr?: boolean;
  href?: string;
  external?: boolean;
  action?: string;
  icon: React.ReactNode;
};

type Faq = { q: string; a: React.ReactNode; plain: string };

export default async function ContactPage() {
  const [s, zones] = await Promise.all([getSettings(), listShippingZones()]);
  const displayCurrency = await getDisplayCurrency(s);
  const money = (n: number) => formatMoney(n, displayCurrency);

  /* ───────── Contact cards (empty settings are hidden) ───────── */
  const primary: Card | null = s.whatsapp
    ? {
        key: "whatsapp",
        latin: "WhatsApp Concierge",
        label: "واتساب",
        value: s.whatsapp,
        ltr: true,
        href: whatsappLink(s.whatsapp, "مرحباً مرموق 👋 عندي استفسار"),
        external: true,
        action: "ابدأ المحادثة",
        icon: <WhatsAppIcon size={26} />,
      }
    : s.instagram
      ? {
          key: "instagram",
          latin: "Instagram Direct",
          label: "رسائل إنستغرام",
          value: handleOf(s.instagram),
          ltr: true,
          href: s.instagram,
          external: true,
          action: "راسلنا على الخاص",
          icon: <InstagramIcon size={26} />,
        }
      : null;

  const cards: Card[] = [];
  if (s.instagram && primary?.key !== "instagram")
    cards.push({
      key: "instagram",
      latin: "Instagram",
      label: "إنستغرام",
      value: handleOf(s.instagram),
      ltr: true,
      href: s.instagram,
      external: true,
      action: "تابعنا",
      icon: <InstagramIcon size={20} />,
    });
  if (s.tiktok)
    cards.push({
      key: "tiktok",
      latin: "TikTok",
      label: "تيك توك",
      value: handleOf(s.tiktok),
      ltr: true,
      href: s.tiktok,
      external: true,
      action: "شاهد الإطلالات",
      icon: <TikTokIcon size={20} />,
    });
  if (s.phone)
    cards.push({
      key: "phone",
      latin: "Call Us",
      label: "اتصل بنا",
      value: s.phone,
      ltr: true,
      href: `tel:${s.phone.replace(/\s+/g, "")}`,
      action: "اتصل الآن",
      icon: <Phone className="size-5" strokeWidth={1.6} />,
    });
  if (s.email)
    cards.push({
      key: "email",
      latin: "Email",
      label: "البريد الإلكتروني",
      value: s.email,
      ltr: true,
      href: `mailto:${s.email}`,
      action: "أرسل رسالة",
      icon: <Mail className="size-5" strokeWidth={1.6} />,
    });
  if (s.workingHours)
    cards.push({
      key: "hours",
      latin: "Opening Hours",
      label: "أوقات الرد",
      value: s.workingHours,
      icon: <Clock className="size-5" strokeWidth={1.6} />,
    });
  if (s.address)
    cards.push({
      key: "address",
      latin: "Based In",
      label: "العنوان",
      value: s.address,
      icon: <MapPin className="size-5" strokeWidth={1.6} />,
    });

  /* ───────── FAQ (answers built from live settings) ───────── */
  const fees = zones.map((z) => z.fee).filter((f) => f > 0);
  const minFee = fees.length ? Math.min(...fees) : 0;
  const fastest = zones.find((z) => z.name.includes("صنعاء")) ?? zones[0];
  const shipText = zones.length
    ? `نوصل إلى ${zones.length} محافظة يمنية. ${fastest ? `في ${fastest.name} يصلك الطلب خلال ${fastest.eta} تقريباً، ` : ""}وباقي المحافظات حسب المسافة. رسوم التوصيل تبدأ من ${money(minFee)}${s.freeShippingThreshold > 0 ? `، والتوصيل مجاني للطلبات من ${money(s.freeShippingThreshold)} فأكثر` : ""}.`
    : s.policies.shipping;

  const banks = s.payments.transfer.accounts.map((a) => a.bank).filter(Boolean);
  const payParts: string[] = [];
  if (s.payments.cod.enabled)
    payParts.push(`${s.payments.cod.label}: ${s.payments.cod.note}`);
  if (s.payments.transfer.enabled)
    payParts.push(
      `${s.payments.transfer.label}${banks.length ? ` (${banks.join("، ")})` : ""}: ${s.payments.transfer.note}`,
    );
  const payText =
    payParts.join(" ") || "نؤكد معك طريقة الدفع المناسبة عند تأكيد الطلب.";

  const sizeText =
    "التريكو بقصّة مريحة: خذ مقاسك المعتاد لإطلالة مرتّبة فوق القميص، أو ارفع مقاساً إذا تحب الراحة. البنطال الكوري بخصر مرتفع — اختر مقاس خصرك الفعلي. اللوفر بالمقاسات الأوروبية ويطابق مقاسك المعتاد. وإذا احترت، أرسل لنا طولك ووزنك ونختار معك.";

  const contactWord = s.whatsapp ? "واتساب" : "رسائل إنستغرام";

  const faqs: Faq[] = [
    {
      q: "كم يأخذ التوصيل، وكم رسومه؟",
      plain: shipText,
      a: (
        <>
          {shipText}{" "}
          <Link
            href="/policies/shipping"
            className="font-medium text-espresso underline decoration-copper/50 underline-offset-4"
          >
            سياسة الشحن والتوصيل
          </Link>
        </>
      ),
    },
    { q: "كيف أدفع؟", plain: payText, a: payText },
    {
      q: "أقدر أستبدل المقاس أو اللون؟",
      plain: s.policies.returns,
      a: (
        <>
          {s.policies.returns}{" "}
          <Link
            href="/policies/returns"
            className="font-medium text-espresso underline decoration-copper/50 underline-offset-4"
          >
            التفاصيل كاملة
          </Link>
        </>
      ),
    },
    { q: "كيف أعرف مقاسي؟", plain: sizeText, a: sizeText },
    {
      q: "هل يتم تأكيد الطلب قبل الشحن؟",
      plain: `نعم. بعد ما تطلب، نتواصل معك هاتفياً أو عبر ${contactWord} لتأكيد العنوان والمقاسات قبل الشحن — عشان يوصلك الطلب صح من أول مرة.`,
      a: `نعم. بعد ما تطلب، نتواصل معك هاتفياً أو عبر ${contactWord} لتأكيد العنوان والمقاسات قبل الشحن — عشان يوصلك الطلب صح من أول مرة.`,
    },
    {
      q: "كيف أتابع طلبي؟",
      plain:
        "من صفحة تتبّع الطلب، أدخل رقم الطلب ورقم جوالك وتشوف حالته لحظة بلحظة.",
      a: (
        <>
          من صفحة{" "}
          <Link
            href="/track"
            className="font-medium text-espresso underline decoration-copper/50 underline-offset-4"
          >
            تتبّع الطلب
          </Link>
          ، أدخل رقم الطلب ورقم جوالك وتشوف حالته لحظة بلحظة.
        </>
      ),
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.plain },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <PageHeader
        eyebrow="Concierge · تواصل معنا"
        title="حيّاك في مرموق"
        subtitle="فريقنا يرد عليك بنفسه — نساعدك تختار المقاس، ننسّق لك طقمك، ونتابع طلبك لين يوصل بابك."
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "تواصل معنا" },
        ]}
      />

      <section aria-label="طرق التواصل" className="bg-ivory py-12 md:py-20">
        <div className="container-luxe">
          {primary && (
            <a
              href={primary.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative isolate mb-4 flex flex-col overflow-hidden rounded-2xl bg-espresso p-7 text-paper grain md:mb-5 md:flex-row md:items-end md:justify-between md:gap-10 md:p-12"
              data-reveal
            >
              <span
                className="pointer-events-none absolute -end-10 -top-24 size-80 rounded-full bg-copper/25 blur-3xl"
                aria-hidden
              />
              <div className="flex items-start gap-5 md:gap-7">
                <span
                  className={cn(
                    "grid size-14 shrink-0 place-items-center rounded-full bg-paper/10 md:size-16",
                    primary.key === "whatsapp" && "text-[#5fd389]",
                  )}
                >
                  {primary.icon}
                </span>
                <div>
                  <p className="eyebrow text-copper-soft">{primary.latin}</p>
                  <p className="display mt-3 text-[1.9rem] leading-tight text-balance md:text-5xl">
                    أسرع طريق لنا: {primary.label}
                  </p>
                  <p className="mt-3 text-sm text-paper/65 md:text-base">
                    <span dir="ltr" className="tabular-nums">
                      {primary.value}
                    </span>
                    {" · "}
                    {primary.key === "whatsapp"
                      ? "نرد عليك خلال دقائق"
                      : "نرد على الخاص خلال اليوم"}
                  </p>
                </div>
              </div>
              <span className="mt-8 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-paper px-7 text-sm font-medium text-espresso transition-colors group-hover:bg-bone md:mt-0">
                {primary.action}
                <ArrowLeft
                  className="size-4 transition-transform duration-500 group-hover:-translate-x-1"
                  aria-hidden
                />
              </span>
            </a>
          )}

          <div
            className={cn(
              "grid gap-4 md:grid-cols-2 lg:gap-5",
              cards.length === 4
                ? "lg:grid-cols-4"
                : cards.length === 2
                  ? "lg:grid-cols-2"
                  : "lg:grid-cols-3",
            )}
          >
            {cards.map((c, i) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-11 place-items-center rounded-full bg-bone text-espresso transition-colors group-hover:bg-espresso group-hover:text-paper">
                      {c.icon}
                    </span>
                    {c.href && (
                      <ArrowUpLeft
                        className="size-5 text-mist transition-all duration-500 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-espresso"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="mt-5 md:mt-8">
                    <p className="eyebrow text-[0.68rem]">{c.latin}</p>
                    <p className="mt-2 text-sm text-taupe">{c.label}</p>
                    <p className="mt-1 text-lg leading-8 text-espresso">
                      {c.ltr ? (
                        <span dir="ltr" className="tabular-nums">
                          {c.value}
                        </span>
                      ) : (
                        c.value
                      )}
                    </p>
                    {c.action && (
                      <p className="mt-3 text-sm font-medium text-copper-deep">
                        {c.action}
                      </p>
                    )}
                  </div>
                </>
              );
              const cls = cn(
                "group flex flex-col justify-between rounded-2xl border border-line bg-paper p-5 transition-colors md:p-7",
                cards.length % 2 === 1 &&
                  i === cards.length - 1 &&
                  "md:col-span-2 lg:col-span-1",
              );
              const style = {
                "--reveal-delay": `${(i + 1) * 70}ms`,
              } as React.CSSProperties;
              return c.href ? (
                <a
                  key={c.key}
                  href={c.href}
                  {...(c.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={cn(cls, "hover:border-espresso/40")}
                  data-reveal
                  style={style}
                >
                  {body}
                </a>
              ) : (
                <div key={c.key} className={cls} data-reveal style={style}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="faq-title"
        className="border-t border-line bg-paper py-16 md:py-24"
      >
        <div className="container-luxe grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow inline-flex items-center gap-3">
                <span className="h-px w-8 bg-gold/70" aria-hidden />
                Questions
              </p>
              <h2
                id="faq-title"
                className="display mt-4 text-[2.2rem] leading-[1.2] text-espresso md:text-5xl"
              >
                أسئلة تهمّك
              </h2>
              <p className="mt-4 max-w-sm text-[0.96rem] leading-8 text-umber">
                التوصيل، الدفع، الاستبدال والمقاسات — باختصار وبوضوح.
              </p>

              <Link
                href="/atelier"
                className="group mt-8 hidden items-center gap-4 rounded-2xl bg-bone/70 p-5 transition-colors hover:bg-bone lg:flex"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-espresso text-paper">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-espresso">
                    محتار في التنسيق؟
                  </span>
                  <span className="block text-xs leading-6 text-taupe">
                    جرّب منسّق الإطلالة وشوف طقمك قبل ما تطلبه.
                  </span>
                </span>
                <ArrowLeft
                  className="size-4 text-taupe transition-transform duration-500 group-hover:-translate-x-1"
                  aria-hidden
                />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="border-t border-line">
              {faqs.map((f, i) => (
                <details
                  key={f.q}
                  name="faq"
                  className="group border-b border-line"
                  open={i === 0}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-copper/40 [&::-webkit-details-marker]:hidden">
                    <span className="latin-italic w-7 shrink-0 text-lg text-copper">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-[1.05rem] font-medium text-espresso md:text-lg">
                      {f.q}
                    </span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-espresso transition-all duration-500 group-open:rotate-45 group-open:border-espresso group-open:bg-espresso group-open:text-paper">
                      <Plus className="size-4" aria-hidden />
                    </span>
                  </summary>
                  <div className="pb-7 ps-12 pe-4 text-[0.97rem] leading-8 text-umber md:pe-16">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
            <p className="mt-8 text-sm text-taupe">
              ما لقيت جوابك؟{" "}
              {primary ? (
                <a
                  href={primary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-espresso underline decoration-copper/50 underline-offset-4"
                >
                  راسلنا على {primary.label}
                </a>
              ) : (
                "راسلنا وبنرد عليك في أقرب وقت."
              )}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
