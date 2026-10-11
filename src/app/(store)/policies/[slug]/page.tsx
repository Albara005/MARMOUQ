import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { getSettings, type StoreSettings } from "@/lib/settings";
import { listShippingZones } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/store/page-header";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PolicyKey = keyof StoreSettings["policies"];

const POLICIES: Record<PolicyKey, { title: string; latin: string; lead: string; icon: typeof Truck }> = {
  shipping: { title: "الشحن والتوصيل", latin: "Shipping & Delivery", lead: "من رفّ مرموق إلى باب بيتك — بتغليف يليق بما بداخله.", icon: Truck },
  returns: { title: "الاستبدال والإرجاع", latin: "Exchanges & Returns", lead: "المقاس ما ضبط؟ ولا يهمك، نرتّبها معك بكل سهولة.", icon: RefreshCcw },
  privacy: { title: "سياسة الخصوصية", latin: "Privacy", lead: "بياناتك أمانة عندنا، ونستخدمها فقط لخدمتك.", icon: ShieldCheck },
};

const ORDER: PolicyKey[] = ["shipping", "returns", "privacy"];
const isPolicy = (s: string): s is PolicyKey => (ORDER as string[]).includes(s);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicy(slug)) return { title: "الصفحة غير موجودة" };
  return { title: POLICIES[slug].title, description: POLICIES[slug].lead, alternates: { canonical: `/policies/${slug}` } };
}

/** Plain-text policy → blocks. Supports "## heading", "- bullet" and blank-line paragraphs. Rendered as text, never as HTML. */
function toBlocks(text: string) {
  type Block = { type: "h"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,3}\s+/.test(line)) blocks.push({ type: "h", text: line.replace(/^#{1,3}\s+/, "") });
    else if (/^[-•*]\s+/.test(line)) {
      const item = line.replace(/^[-•*]\s+/, "");
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(item);
      else blocks.push({ type: "ul", items: [item] });
    } else blocks.push({ type: "p", text: line });
  }
  return blocks;
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  if (!isPolicy(slug)) notFound();

  const [settings, zones] = await Promise.all([getSettings(), slug === "shipping" ? listShippingZones() : Promise.resolve([])]);
  const meta = POLICIES[slug];
  const blocks = toBlocks(settings.policies[slug] || "");
  const money = (n: number) => formatMoney(n, settings.currency);
  const contactHref = "/contact";

  return (
    <>
      <PageHeader
        eyebrow={`Policies · ${meta.latin}`}
        title={meta.title}
        subtitle={meta.lead}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "السياسات" }, { label: meta.title }]}
      />

      <div className="bg-ivory pb-20 pt-8 md:pb-28 md:pt-14">
        <div className="container-luxe grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Side navigation (pills on phones) */}
          <aside className="min-w-0 lg:col-span-3">
            <nav aria-label="السياسات" className="lg:sticky lg:top-28">
              <p className="eyebrow mb-4 hidden lg:block">All Policies</p>
              <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-10 md:px-10 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-y lg:border-line lg:px-0">
                {ORDER.map((key) => {
                  const p = POLICIES[key];
                  const active = key === slug;
                  const Icon = p.icon;
                  return (
                    <li key={key} className="shrink-0 lg:border-b lg:border-line lg:last:border-b-0">
                      <Link
                        href={`/policies/${key}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-full border px-4 text-sm transition-colors lg:min-h-14 lg:rounded-none lg:border-0 lg:px-0",
                          active ? "border-espresso bg-espresso text-paper lg:bg-transparent lg:font-medium lg:text-espresso" : "border-line bg-paper text-umber hover:text-espresso lg:bg-transparent",
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "lg:text-copper" : "text-taupe")} strokeWidth={1.6} aria-hidden />
                        <span className="flex-1 whitespace-nowrap">{p.title}</span>
                        <span className={cn("hidden h-px w-6 bg-copper transition-all lg:block", active ? "opacity-100" : "w-0 opacity-0")} aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0 lg:col-span-7" aria-labelledby="policy-body">
            <h2 id="policy-body" className="sr-only">
              {meta.title}
            </h2>
            {blocks.length ? (
              <div className="prose-luxe text-[1.02rem]">
                {blocks.map((b, i) =>
                  b.type === "h" ? (
                    <h2 key={i}>{b.text}</h2>
                  ) : b.type === "ul" ? (
                    <ul key={i} className="my-4 space-y-2 ps-5 text-umber marker:text-copper [list-style:disc]">
                      {b.items.map((it, j) => (
                        <li key={j} className="leading-8">
                          {it}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className={cn(i === 0 && "text-lg leading-9 text-espresso")}>
                      {b.text}
                    </p>
                  ),
                )}
              </div>
            ) : (
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-paper p-6 text-umber">
                <FileText className="mt-1 size-5 shrink-0 text-taupe" aria-hidden />
                <p className="text-sm leading-7">نحدّث نص هذه السياسة حالياً. لأي استفسار عاجل، تواصل معنا وبنوضّح لك كل التفاصيل.</p>
              </div>
            )}

            {slug === "shipping" && zones.length > 0 && (
              <section aria-labelledby="zones-title" className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 id="zones-title" className="display text-2xl text-espresso">
                    رسوم ومدة التوصيل
                  </h2>
                  {settings.freeShippingThreshold > 0 && (
                    <p className="rounded-full bg-copper/10 px-3.5 py-1.5 text-xs font-medium text-copper-deep">
                      توصيل مجاني للطلبات من {money(settings.freeShippingThreshold)}
                    </p>
                  )}
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-paper">
                  <table className="w-full text-sm">
                    <caption className="sr-only">رسوم التوصيل ومدته حسب المحافظة</caption>
                    <thead className="bg-bone/60 text-xs text-taupe">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-start font-medium md:px-6">
                          المحافظة
                        </th>
                        <th scope="col" className="px-4 py-3 text-start font-medium">
                          المدة
                        </th>
                        <th scope="col" className="px-4 py-3 text-end font-medium md:px-6">
                          الرسوم
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {zones.map((z) => (
                        <tr key={z.id}>
                          <th scope="row" className="px-4 py-3 text-start font-normal text-espresso md:px-6">
                            {z.name}
                          </th>
                          <td className="px-4 py-3 text-taupe tabular-nums">{z.eta || "—"}</td>
                          <td className="px-4 py-3 text-end tabular-nums text-umber md:px-6">{z.fee > 0 ? money(z.fee) : "مجاني"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="mt-12 flex flex-col gap-4 rounded-2xl bg-bone/70 p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
              <div>
                <p className="display text-xl text-espresso">عندك سؤال ما لقيت جوابه؟</p>
                <p className="mt-1 text-sm text-taupe">فريق مرموق يرد عليك بنفسه ويوضّح لك كل شيء.</p>
              </div>
              <Link
                href={contactHref}
                className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-espresso px-6 text-sm font-medium text-paper transition-colors hover:bg-cocoa"
              >
                تواصل معنا
                <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
