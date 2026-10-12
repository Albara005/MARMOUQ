"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Coins, CreditCard, FileText, Globe, House, Megaphone, Plus, Search, Store, Truck, CircleAlert } from "lucide-react";
import type { BarTone, HomeSectionKey, MarketCurrency, StoreSettings } from "@/lib/settings";
import type { MediaLike } from "@/components/ui/media-image";
import { formatMoney, type Currency } from "@/lib/money";
import { cn, whatsappLink } from "@/lib/utils";
import { Input, Label, Select, Switch, Textarea } from "@/components/ui/field";
import { ActionFieldError, ActionForm, ActionFormError, SubmitButton, useActionFormState } from "@/components/admin/ui-client";
import { ImageUploader } from "@/components/admin/image-uploader";
import { saveSettingsAction } from "@/app/admin/(panel)/settings/actions";
import { ListEditor } from "./list-editors";

type TabId = "identity" | "home" | "bars" | "markets" | "payments" | "shipping" | "policies" | "seo";
const TABS: { id: TabId; label: string; icon: typeof Store; prefixes: string[] }[] = [
  { id: "identity", label: "الهوية والتواصل", icon: Store, prefixes: ["storeName", "storeNameEn", "tagline", "description", "whatsapp", "phone", "email", "instagram", "tiktok", "address", "workingHours"] },
  { id: "home", label: "الواجهة الرئيسية", icon: House, prefixes: ["hero", "testimonials", "home"] },
  { id: "bars", label: "الأشرطة الإعلانية", icon: Megaphone, prefixes: ["bars", "announcements"] },
  { id: "markets", label: "العملات والأسواق", icon: Coins, prefixes: ["markets"] },
  { id: "payments", label: "المدفوعات", icon: CreditCard, prefixes: ["payments"] },
  { id: "shipping", label: "الشحن والعملة", icon: Truck, prefixes: ["currency", "freeShippingThreshold", "lowStockThreshold"] },
  { id: "policies", label: "السياسات", icon: FileText, prefixes: ["policies"] },
  { id: "seo", label: "محركات البحث", icon: Globe, prefixes: ["seo"] },
];

function tabOf(path: string): TabId | null {
  const root = path.split(".")[0];
  return TABS.find((t) => t.prefixes.includes(root))?.id ?? null;
}

/* ─────────── small field helpers ─────────── */

function F({ label, name, hint, children, className }: { label: ReactNode; name: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  const { state } = useActionFormState();
  const err = state && !state.ok ? state.fieldErrors?.[name] : undefined;
  return (
    <div className={className} data-invalid={err ? "" : undefined}>
      <Label htmlFor={`s-${name}`}>{label}</Label>
      {children}
      {err ? <ActionFieldError name={name} /> : hint ? <p className="mt-1.5 text-xs leading-5 text-taupe">{hint}</p> : null}
    </div>
  );
}

function Section({ title, description, children, aside }: { title: string; description?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_2px_rgba(28,19,15,0.04)] md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-semibold text-espresso">{title}</h3>
          {description && <p className="mt-0.5 text-[0.8rem] leading-relaxed text-taupe">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

const inputSm = "h-11";

export function SettingsForm({
  initial,
  heroMedia,
  mobileHeroMedia = null,
  productOptions = [],
  lookOptions = [],
  initialTab,
}: {
  initial: StoreSettings;
  heroMedia: MediaLike | null;
  mobileHeroMedia?: MediaLike | null;
  productOptions?: { slug: string; name: string }[];
  lookOptions?: { slug: string; title: string }[];
  initialTab: string;
}) {
  const [s, setS] = useState<StoreSettings>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [hero, setHero] = useState<MediaLike[]>(heroMedia ? [heroMedia] : []);
  const [mobileHero, setMobileHero] = useState<MediaLike[]>(mobileHeroMedia ? [mobileHeroMedia] : []);
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "identity");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const payload = useMemo(() => ({ ...s, hero: { ...s.hero, mediaId: hero[0]?.id ?? null, mobileMediaId: mobileHero[0]?.id ?? null } }), [s, hero, mobileHero]);
  const json = JSON.stringify(payload);
  const dirty = json !== saved;

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const setIn = <K extends "hero" | "currency" | "policies" | "seo">(k: K, patch: Partial<StoreSettings[K]>) => setS((p) => ({ ...p, [k]: { ...p[k], ...patch } }));
  const setHome = <K extends Exclude<keyof StoreSettings["home"], "sections">>(k: K, patch: Partial<StoreSettings["home"][K]>) =>
    setS((p) => ({ ...p, home: { ...p.home, [k]: { ...p.home[k], ...patch } } }));
  const toggleSection = (k: HomeSectionKey, on: boolean) => setS((p) => ({ ...p, home: { ...p.home, sections: { ...p.home.sections, [k]: on } } }));
  const sectionSwitch = (k: HomeSectionKey) => <Switch checked={s.home.sections[k]} onChange={(e) => toggleSection(k, e.target.checked)} label="ظاهر" />;
  const copyFields = (k: "categories" | "newArrivals" | "craft", hasSubtitle = true) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <F label="العنوان الصغير (فوق العنوان)" name={`home.${k}.eyebrow`}>
        <Input id={`s-home.${k}.eyebrow`} className={inputSm} value={s.home[k].eyebrow} onChange={(e) => setHome(k, { eyebrow: e.target.value })} />
      </F>
      <F label="العنوان" name={`home.${k}.title`}>
        <Input id={`s-home.${k}.title`} className={inputSm} value={s.home[k].title} onChange={(e) => setHome(k, { title: e.target.value })} />
      </F>
      {hasSubtitle && (
        <F label="الوصف" name={`home.${k}.subtitle`} className="sm:col-span-2">
          <Textarea id={`s-home.${k}.subtitle`} rows={2} value={s.home[k].subtitle} onChange={(e) => setHome(k, { subtitle: e.target.value })} />
        </F>
      )}
    </div>
  );
  const setBar = <K extends "announcement" | "marquee">(k: K, patch: Partial<StoreSettings["bars"][K]>) =>
    setS((p) => ({ ...p, bars: { ...p.bars, [k]: { ...p.bars[k], ...patch } } }));
  const setPay = (k: "cod" | "transfer", patch: Partial<StoreSettings["payments"]["transfer"]>) =>
    setS((p) => ({ ...p, payments: { ...p.payments, [k]: { ...p.payments[k], ...patch } } }));

  const errTabs = new Set(Object.keys(errors).map(tabOf).filter(Boolean) as TabId[]);
  const money = (n: number) => formatMoney(n, s.currency);
  const igHandle = s.instagram.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];

  return (
    <ActionForm
      action={saveSettingsAction}
      onResult={(r) => {
        if (r.ok) {
          const next = (r.data?.settings as StoreSettings | undefined) ?? payload;
          setS(next);
          setSaved(JSON.stringify({ ...next, hero: { ...next.hero, mediaId: hero[0]?.id ?? null, mobileMediaId: mobileHero[0]?.id ?? null } }));
          setErrors({});
        } else {
          const fe = r.fieldErrors ?? {};
          setErrors(fe);
          const first = Object.keys(fe).map(tabOf).find(Boolean);
          if (first && first !== tab) setTab(first);
          topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }}
      className="pb-24"
    >
      <input type="hidden" name="payload" value={json} />
      <div ref={topRef} className="scroll-mt-24" />

      <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        {/* Tabs */}
        <nav aria-label="أقسام الإعدادات" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul role="tablist" aria-orientation="vertical" className="flex min-w-max gap-1.5 lg:min-w-0 lg:flex-col lg:gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = t.id === tab;
              return (
                <li key={t.id} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={active}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "relative flex h-10 w-full items-center gap-2.5 rounded-full px-4 text-sm transition-colors lg:h-11 lg:rounded-xl",
                      active ? "bg-espresso text-paper" : "bg-paper text-umber ring-1 ring-line hover:text-espresso lg:bg-transparent lg:ring-0 lg:hover:bg-bone",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-copper-soft" : "text-taupe")} aria-hidden />
                    <span className="whitespace-nowrap">{t.label}</span>
                    {errTabs.has(t.id) && <span className="ms-auto size-2 rounded-full bg-danger" aria-label="يحتوي على أخطاء" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <ActionFormError />

          {/* ── Identity ── */}
          <div role="tabpanel" id="panel-identity" aria-labelledby="tab-identity" hidden={tab !== "identity"} className="space-y-5">
            <Section title="هوية المتجر" description="الاسم والشعار النصي كما يظهران في رأس المتجر وتذييله.">
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="اسم المتجر" name="storeName">
                  <Input id="s-storeName" className={inputSm} value={s.storeName} onChange={(e) => set("storeName", e.target.value)} />
                </F>
                <F label="الاسم اللاتيني" name="storeNameEn">
                  <Input id="s-storeNameEn" className={inputSm} dir="ltr" value={s.storeNameEn} onChange={(e) => set("storeNameEn", e.target.value)} />
                </F>
                <F label="الشعار النصي" name="tagline" className="sm:col-span-2">
                  <Input id="s-tagline" className={inputSm} value={s.tagline} onChange={(e) => set("tagline", e.target.value)} />
                </F>
                <F label="نبذة قصيرة" name="description" className="sm:col-span-2" hint={`${s.description.length}/400 — تظهر في التذييل وصفحة «عن مرموق».`}>
                  <Textarea id="s-description" rows={3} value={s.description} onChange={(e) => set("description", e.target.value)} />
                </F>
              </div>
            </Section>
            <Section title="قنوات التواصل" description="الحقول الفارغة تُخفى من المتجر تلقائياً — وإن غاب واتساب يُستبدل بإنستغرام.">
              <div className="grid gap-4 sm:grid-cols-2">
                <F
                  label="واتساب الطلبات"
                  name="whatsapp"
                  hint={
                    s.whatsapp ? (
                      <a href={whatsappLink(s.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-copper-deep underline-offset-4 hover:underline" dir="ltr">
                        {whatsappLink(s.whatsapp).replace("https://", "")}
                      </a>
                    ) : (
                      "مع رمز الدولة، مثل 967770000000"
                    )
                  }
                >
                  <Input id="s-whatsapp" className={inputSm} dir="ltr" inputMode="tel" placeholder="967770000000" value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} style={{ textAlign: "right" }} />
                </F>
                <F label="رقم الاتصال" name="phone">
                  <Input id="s-phone" className={inputSm} dir="ltr" inputMode="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} style={{ textAlign: "right" }} />
                </F>
                <F label="البريد الإلكتروني" name="email">
                  <Input id="s-email" className={inputSm} dir="ltr" type="email" value={s.email} onChange={(e) => set("email", e.target.value)} style={{ textAlign: "right" }} />
                </F>
                <F label="إنستغرام" name="instagram" hint={igHandle ? `@${igHandle}` : "الرابط الكامل أو المعرّف مثل @marmouq.ye"}>
                  <Input id="s-instagram" className={inputSm} dir="ltr" value={s.instagram} onChange={(e) => set("instagram", e.target.value)} style={{ textAlign: "right" }} />
                </F>
                <F label="تيك توك" name="tiktok">
                  <Input id="s-tiktok" className={inputSm} dir="ltr" value={s.tiktok} onChange={(e) => set("tiktok", e.target.value)} style={{ textAlign: "right" }} />
                </F>
                <F label="العنوان" name="address">
                  <Input id="s-address" className={inputSm} value={s.address} onChange={(e) => set("address", e.target.value)} />
                </F>
                <F label="ساعات العمل" name="workingHours" className="sm:col-span-2">
                  <Input id="s-workingHours" className={inputSm} value={s.workingHours} onChange={(e) => set("workingHours", e.target.value)} />
                </F>
              </div>
            </Section>
          </div>

          {/* ── Home ── */}
          <div role="tabpanel" id="panel-home" aria-labelledby="tab-home" hidden={tab !== "home"} className="space-y-5">
            <Section title="الواجهة الرئيسية" description="أول ما يراه العميل — اجعل العنوان قصيراً وواثقاً.">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="سطر علوي صغير" name="hero.eyebrow" className="sm:col-span-2">
                    <Input id="s-hero.eyebrow" className={inputSm} value={s.hero.eyebrow} onChange={(e) => setIn("hero", { eyebrow: e.target.value })} />
                  </F>
                  <F label="العنوان" name="hero.title" className="sm:col-span-2" hint="استخدم سطراً جديداً لكسر العنوان على سطرين.">
                    <Textarea id="s-hero.title" rows={2} className="min-h-0 text-lg" value={s.hero.title} onChange={(e) => setIn("hero", { title: e.target.value })} />
                  </F>
                  <F label="النص التعريفي" name="hero.subtitle" className="sm:col-span-2">
                    <Textarea id="s-hero.subtitle" rows={3} value={s.hero.subtitle} onChange={(e) => setIn("hero", { subtitle: e.target.value })} />
                  </F>
                  <F label="نص الزر" name="hero.ctaLabel">
                    <Input id="s-hero.ctaLabel" className={inputSm} value={s.hero.ctaLabel} onChange={(e) => setIn("hero", { ctaLabel: e.target.value })} />
                  </F>
                  <F label="رابط الزر" name="hero.ctaHref" hint="/shop أو /looks/burgundy-edit">
                    <Input id="s-hero.ctaHref" className={inputSm} dir="ltr" value={s.hero.ctaHref} onChange={(e) => setIn("hero", { ctaHref: e.target.value })} style={{ textAlign: "right" }} />
                  </F>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-umber">معاينة</p>
                  <div className="grain relative overflow-hidden rounded-xl bg-espresso p-5 text-paper" aria-hidden>
                    {hero[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/media/${hero[0].id}/sm`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
                    )}
                    <div className="relative z-10 flex min-h-[220px] flex-col justify-end">
                      <p className="text-[0.6rem] tracking-[0.25em] text-copper-soft">{s.hero.eyebrow}</p>
                      <p className="display mt-2 whitespace-pre-line text-[1.35rem] leading-tight">{s.hero.title || "العنوان"}</p>
                      <p className="mt-2 line-clamp-3 text-[0.7rem] leading-5 text-paper/75">{s.hero.subtitle}</p>
                      <span className="mt-3 inline-flex h-8 w-fit items-center rounded-full bg-paper px-4 text-[0.7rem] font-medium text-espresso">{s.hero.ctaLabel || "الزر"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <ImageUploader
                  value={hero}
                  onChange={setHero}
                  multiple={false}
                  label="صورة الواجهة"
                  hint="صورة عمودية أو أفقية بجودة عالية. إن تُركت فارغة تُستخدم صورة أول إطلالة مميزة."
                  alt={s.hero.title.replace(/\n/g, " ")}
                />
                <ActionFieldError name="hero.mediaId" />
              </div>
              <div className="mt-6 grid gap-5 border-t border-line pt-5 md:grid-cols-2">
                <div>
                  <ImageUploader
                    value={mobileHero}
                    onChange={setMobileHero}
                    multiple={false}
                    label="صورة خاصة بالجوال (اختيارية)"
                    hint="صورة عمودية تظهر على شاشات الجوال بدلاً من الصورة الرئيسية."
                    alt={s.hero.title.replace(/\n/g, " ")}
                  />
                  <ActionFieldError name="hero.mobileMediaId" />
                </div>
                <div className="space-y-4">
                  <F label={`تعتيم الصورة: ${s.hero.overlay}%`} name="hero.overlay" hint="زِده إذا كان النص غير واضح فوق الصورة.">
                    <input
                      id="s-hero.overlay"
                      type="range"
                      min={0}
                      max={90}
                      step={5}
                      value={s.hero.overlay}
                      onChange={(e) => setIn("hero", { overlay: Number(e.target.value) })}
                      className="w-full accent-copper"
                    />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="الزر الثاني" name="hero.secondaryLabel" hint="اتركه فارغاً لإخفائه">
                      <Input id="s-hero.secondaryLabel" className={inputSm} value={s.hero.secondaryLabel} onChange={(e) => setIn("hero", { secondaryLabel: e.target.value })} />
                    </F>
                    <F label="رابطه" name="hero.secondaryHref">
                      <Input id="s-hero.secondaryHref" dir="ltr" className={inputSm} value={s.hero.secondaryHref} onChange={(e) => setIn("hero", { secondaryHref: e.target.value })} style={{ textAlign: "right" }} />
                    </F>
                  </div>
                  <F label="النص الجانبي (للكمبيوتر)" name="hero.sideText" hint="اتركه فارغاً لإخفائه">
                    <Input id="s-hero.sideText" dir="ltr" className={inputSm} value={s.hero.sideText} onChange={(e) => setIn("hero", { sideText: e.target.value })} style={{ textAlign: "right" }} />
                  </F>
                </div>
              </div>
            </Section>

            <Section title="شبكة الأقسام" description="صور الأقسام نفسها تُغيَّر من صفحة «التصنيفات»." aside={sectionSwitch("categories")}>
              {copyFields("categories")}
            </Section>

            <Section title="قصة الألوان" description="قسم تفاعلي يغيّر لون الخلفية مع كل لون للمنتج المختار." aside={sectionSwitch("colourStory")}>
              <div className="grid gap-3 sm:grid-cols-3">
                <F label="العنوان الصغير" name="home.colourStory.eyebrow">
                  <Input id="s-home.colourStory.eyebrow" className={inputSm} value={s.home.colourStory.eyebrow} onChange={(e) => setHome("colourStory", { eyebrow: e.target.value })} />
                </F>
                <F label="العنوان" name="home.colourStory.title">
                  <Input id="s-home.colourStory.title" className={inputSm} value={s.home.colourStory.title} onChange={(e) => setHome("colourStory", { title: e.target.value })} />
                </F>
                <F label="المنتج المعروض" name="home.colourStory.productSlug" hint="يجب أن يكون له لونان أو أكثر">
                  <Select id="s-home.colourStory.productSlug" className={inputSm} value={s.home.colourStory.productSlug} onChange={(e) => setHome("colourStory", { productSlug: e.target.value })}>
                    <option value="">تلقائي</option>
                    {productOptions.map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </F>
              </div>
            </Section>

            <Section title="وصل حديثاً" aside={sectionSwitch("newArrivals")}>
              {copyFields("newArrivals")}
              <F label="المنتجات المعروضة" name="home.newArrivals.source" className="mt-3 sm:w-1/2">
                <Select id="s-home.newArrivals.source" className={inputSm} value={s.home.newArrivals.source} onChange={(e) => setHome("newArrivals", { source: e.target.value as "newest" | "featured" | "all" })}>
                  <option value="all">كل المنتجات بالترتيب المحدد</option>
                  <option value="newest">الأحدث إضافةً</option>
                  <option value="featured">المنتجات المميزة فقط</option>
                </Select>
              </F>
            </Section>

            <Section title="إطلالة الموسم" description="تُعدَّل صورة الإطلالة ونقاطها من صفحة «الإطلالات»." aside={sectionSwitch("look")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="العنوان الصغير" name="home.look.eyebrow">
                  <Input id="s-home.look.eyebrow" className={inputSm} value={s.home.look.eyebrow} onChange={(e) => setHome("look", { eyebrow: e.target.value })} />
                </F>
                <F label="الإطلالة المعروضة" name="home.look.lookSlug">
                  <Select id="s-home.look.lookSlug" className={inputSm} value={s.home.look.lookSlug} onChange={(e) => setHome("look", { lookSlug: e.target.value })}>
                    <option value="">أول إطلالة منشورة</option>
                    {lookOptions.map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.title}
                      </option>
                    ))}
                  </Select>
                </F>
              </div>
            </Section>

            <Section title="تفاصيل مختارة بعناية" aside={sectionSwitch("craft")}>
              {copyFields("craft")}
              <div className="mt-4">
                <ListEditor
                  items={s.home.craft.items}
                  onChange={(items) => setHome("craft", { items })}
                  create={() => ({ title: "", body: "" })}
                  max={6}
                  addLabel="إضافة نقطة"
                  emptyLabel="لا نقاط — ستظهر النقاط الافتراضية."
                  itemLabel={(i) => `النقطة ${i + 1}`}
                  render={(it, update, i) => (
                    <div className="grid gap-2">
                      <Input aria-label="عنوان النقطة" className="h-10 text-sm" value={it.title} maxLength={40} onChange={(e) => update({ ...it, title: e.target.value })} placeholder="الخامة أولاً" />
                      <ActionFieldError name={`home.craft.items.${i}.title`} />
                      <Textarea aria-label="وصف النقطة" rows={2} className="min-h-0 text-sm" value={it.body} maxLength={240} onChange={(e) => update({ ...it, body: e.target.value })} />
                    </div>
                  )}
                />
              </div>
            </Section>

            <Section title="المتابعون وآراء العملاء" description="الشهادات نفسها تُعدَّل في القسم التالي." aside={sectionSwitch("social")}>
              <div className="grid gap-3 sm:grid-cols-3">
                <F label="العنوان الصغير" name="home.social.eyebrow">
                  <Input id="s-home.social.eyebrow" className={inputSm} value={s.home.social.eyebrow} onChange={(e) => setHome("social", { eyebrow: e.target.value })} />
                </F>
                <F label="الرقم الكبير" name="home.social.statValue" hint="مثل 69K — فارغ لإخفائه">
                  <Input id="s-home.social.statValue" dir="ltr" className={inputSm} value={s.home.social.statValue} onChange={(e) => setHome("social", { statValue: e.target.value })} />
                </F>
                <F label="العنوان" name="home.social.title">
                  <Input id="s-home.social.title" className={inputSm} value={s.home.social.title} onChange={(e) => setHome("social", { title: e.target.value })} />
                </F>
                <F label="النص" name="home.social.text" className="sm:col-span-3">
                  <Textarea id="s-home.social.text" rows={2} value={s.home.social.text} onChange={(e) => setHome("social", { text: e.target.value })} />
                </F>
              </div>
            </Section>

            <Section title="دعوة منسّق الإطلالة" aside={sectionSwitch("atelier")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="العنوان الصغير" name="home.atelier.eyebrow">
                  <Input id="s-home.atelier.eyebrow" className={inputSm} value={s.home.atelier.eyebrow} onChange={(e) => setHome("atelier", { eyebrow: e.target.value })} />
                </F>
                <F label="نص الزر" name="home.atelier.ctaLabel">
                  <Input id="s-home.atelier.ctaLabel" className={inputSm} value={s.home.atelier.ctaLabel} onChange={(e) => setHome("atelier", { ctaLabel: e.target.value })} />
                </F>
                <F label="العنوان" name="home.atelier.title" className="sm:col-span-2">
                  <Input id="s-home.atelier.title" className={inputSm} value={s.home.atelier.title} onChange={(e) => setHome("atelier", { title: e.target.value })} />
                </F>
                <F label="النص" name="home.atelier.text" className="sm:col-span-2">
                  <Textarea id="s-home.atelier.text" rows={2} value={s.home.atelier.text} onChange={(e) => setHome("atelier", { text: e.target.value })} />
                </F>
              </div>
            </Section>

            <Section title="آراء العملاء" description="شهادات حقيقية من عملائك تظهر في الصفحة الرئيسية.">
              <ListEditor
                items={s.testimonials}
                onChange={(v) => set("testimonials", v)}
                create={() => ({ name: "", city: "", quote: "" })}
                max={12}
                addLabel="إضافة شهادة"
                emptyLabel="لا شهادات — سيُخفى القسم من الصفحة الرئيسية."
                itemLabel={(i) => `الشهادة ${i + 1}`}
                render={(t, update, i) => (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`s-tn-${i}`} className="sr-only">الاسم</label>
                      <Input id={`s-tn-${i}`} className="h-10 text-sm" placeholder="الاسم" value={t.name} onChange={(e) => update({ ...t, name: e.target.value })} />
                      <ActionFieldError name={`testimonials.${i}.name`} />
                    </div>
                    <div>
                      <label htmlFor={`s-tc-${i}`} className="sr-only">المدينة</label>
                      <Input id={`s-tc-${i}`} className="h-10 text-sm" placeholder="المدينة" value={t.city} onChange={(e) => update({ ...t, city: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor={`s-tq-${i}`} className="sr-only">نص الشهادة</label>
                      <Textarea id={`s-tq-${i}`} rows={2} className="min-h-0 text-sm" placeholder="ماذا قال العميل؟" value={t.quote} onChange={(e) => update({ ...t, quote: e.target.value })} />
                      <ActionFieldError name={`testimonials.${i}.quote`} />
                    </div>
                  </div>
                )}
              />
            </Section>
          </div>

          {/* ── Payments ── */}
          <div role="tabpanel" id="panel-payments" aria-labelledby="tab-payments" hidden={tab !== "payments"} className="space-y-5">
            <Section
              title="الدفع عند الاستلام"
              description="الطريقة الأكثر طلباً في اليمن."
              aside={<Switch checked={s.payments.cod.enabled} onChange={(e) => setPay("cod", { enabled: e.target.checked })} label={s.payments.cod.enabled ? "مفعّل" : "موقوف"} />}
            >
              <ActionFieldError name="payments.cod.enabled" className="-mt-3 mb-3" />
              <div className={cn("grid gap-4 sm:grid-cols-2", !s.payments.cod.enabled && "opacity-60")}>
                <F label="الاسم الظاهر للعميل" name="payments.cod.label">
                  <Input id="s-payments.cod.label" className={inputSm} value={s.payments.cod.label} onChange={(e) => setPay("cod", { label: e.target.value })} />
                </F>
                <F label="ملاحظة" name="payments.cod.note" className="sm:col-span-2">
                  <Textarea id="s-payments.cod.note" rows={2} value={s.payments.cod.note} onChange={(e) => setPay("cod", { note: e.target.value })} />
                </F>
              </div>
            </Section>
            <Section
              title="حوالة / محفظة إلكترونية"
              description="الكريمي، النجم، جوالي، ون كاش… أضف الحسابات التي تظهر للعميل بعد الطلب."
              aside={<Switch checked={s.payments.transfer.enabled} onChange={(e) => setPay("transfer", { enabled: e.target.checked })} label={s.payments.transfer.enabled ? "مفعّل" : "موقوف"} />}
            >
              <div className={cn("space-y-5", !s.payments.transfer.enabled && "opacity-60")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="الاسم الظاهر للعميل" name="payments.transfer.label">
                    <Input id="s-payments.transfer.label" className={inputSm} value={s.payments.transfer.label} onChange={(e) => setPay("transfer", { label: e.target.value })} />
                  </F>
                  <F label="التعليمات" name="payments.transfer.note" className="sm:col-span-2">
                    <Textarea id="s-payments.transfer.note" rows={2} value={s.payments.transfer.note} onChange={(e) => setPay("transfer", { note: e.target.value })} />
                  </F>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-umber">الحسابات</p>
                  <ActionFieldError name="payments.transfer.accounts" className="mb-2" />
                  <ListEditor
                    items={s.payments.transfer.accounts}
                    onChange={(v) => setPay("transfer", { accounts: v })}
                    create={() => ({ bank: "", holder: "", number: "" })}
                    max={8}
                    addLabel="إضافة حساب"
                    emptyLabel="لا حسابات بعد."
                    itemLabel={(i) => `الحساب ${i + 1}`}
                    render={(a, update, i) => (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <label htmlFor={`s-ab-${i}`} className="sr-only">الجهة</label>
                          <Input id={`s-ab-${i}`} className="h-10 text-sm" placeholder="الجهة (الكريمي)" value={a.bank} onChange={(e) => update({ ...a, bank: e.target.value })} />
                          <ActionFieldError name={`payments.transfer.accounts.${i}.bank`} />
                        </div>
                        <div>
                          <label htmlFor={`s-ah-${i}`} className="sr-only">اسم المستفيد</label>
                          <Input id={`s-ah-${i}`} className="h-10 text-sm" placeholder="اسم المستفيد" value={a.holder} onChange={(e) => update({ ...a, holder: e.target.value })} />
                        </div>
                        <div>
                          <label htmlFor={`s-an-${i}`} className="sr-only">رقم الحساب</label>
                          <Input id={`s-an-${i}`} className="h-10 text-sm" dir="ltr" placeholder="رقم الحساب" value={a.number} onChange={(e) => update({ ...a, number: e.target.value })} style={{ textAlign: "right" }} />
                          <ActionFieldError name={`payments.transfer.accounts.${i}.number`} />
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </Section>
          </div>

          {/* ── Shipping & currency ── */}
          <div role="tabpanel" id="panel-shipping" aria-labelledby="tab-shipping" hidden={tab !== "shipping"} className="space-y-5">
            <Section title="الشحن والمخزون">
              <div className="grid gap-4 sm:grid-cols-2">
                <F
                  label="حد الشحن المجاني"
                  name="freeShippingThreshold"
                  hint={s.freeShippingThreshold > 0 ? `يظهر للعميل: «أضف ${money(Math.round(s.freeShippingThreshold / 4))} للحصول على شحن مجاني»` : "0 = بدون شحن مجاني"}
                >
                  <div className="relative">
                    <Input
                      id="s-freeShippingThreshold"
                      className={cn(inputSm, "pe-14")}
                      inputMode="numeric"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                      value={String(s.freeShippingThreshold)}
                      onChange={(e) => set("freeShippingThreshold", Number(e.target.value.replace(/\D/g, "")) || 0)}
                    />
                    <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-taupe">{s.currency.symbol}</span>
                  </div>
                </F>
                <F label="تنبيه انخفاض المخزون" name="lowStockThreshold" hint="تُعلَّم القطعة «قاربت على النفاد» عند هذا العدد أو أقل.">
                  <Input
                    id="s-lowStockThreshold"
                    className={inputSm}
                    inputMode="numeric"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    value={String(s.lowStockThreshold)}
                    onChange={(e) => set("lowStockThreshold", Number(e.target.value.replace(/\D/g, "")) || 0)}
                  />
                </F>
              </div>
            </Section>
            <Section title="العملة" description="الأسعار تُخزّن كأرقام صحيحة؛ تغيير العملة لا يحوّل الأسعار." aside={<span className="rounded-full bg-bone px-3 py-1 text-sm font-semibold tabular-nums text-espresso">{money(125000)}</span>}>
              <div className="grid gap-4 sm:grid-cols-3">
                <F label="الرمز الدولي" name="currency.code">
                  <Input id="s-currency.code" className={inputSm} dir="ltr" maxLength={3} value={s.currency.code} onChange={(e) => setIn("currency", { code: e.target.value.toUpperCase() })} style={{ textAlign: "right" }} />
                </F>
                <F label="الرمز الظاهر" name="currency.symbol">
                  <Input id="s-currency.symbol" className={inputSm} value={s.currency.symbol} onChange={(e) => setIn("currency", { symbol: e.target.value })} />
                </F>
                <F label="موضع الرمز" name="currency.position">
                  <Select id="s-currency.position" className={inputSm} value={s.currency.position} onChange={(e) => setIn("currency", { position: e.target.value as "after" | "before" })}>
                    <option value="after">بعد الرقم (125,000 ر.ي)</option>
                    <option value="before">قبل الرقم ($ 125)</option>
                  </Select>
                </F>
              </div>
            </Section>
          </div>

          {/* ── Policies ── */}
          <div role="tabpanel" id="panel-policies" aria-labelledby="tab-policies" hidden={tab !== "policies"} className="space-y-5">
            <Section title="السياسات" description="تظهر في صفحات السياسات وصفحة إتمام الطلب. اكتب بلغة بسيطة وواضحة.">
              <div className="space-y-4">
                <F label="الشحن والتوصيل" name="policies.shipping">
                  <Textarea id="s-policies.shipping" rows={5} value={s.policies.shipping} onChange={(e) => setIn("policies", { shipping: e.target.value })} />
                </F>
                <F label="الاستبدال والإرجاع" name="policies.returns">
                  <Textarea id="s-policies.returns" rows={5} value={s.policies.returns} onChange={(e) => setIn("policies", { returns: e.target.value })} />
                </F>
                <F label="الخصوصية" name="policies.privacy">
                  <Textarea id="s-policies.privacy" rows={5} value={s.policies.privacy} onChange={(e) => setIn("policies", { privacy: e.target.value })} />
                </F>
              </div>
            </Section>
          </div>

          {/* ── SEO ── */}
          <div role="tabpanel" id="panel-seo" aria-labelledby="tab-seo" hidden={tab !== "seo"} className="space-y-5">
            <Section title="محركات البحث والمشاركة" description="العنوان والوصف اللذان يظهران في Google وعند مشاركة رابط المتجر.">
              <div className="space-y-4">
                <F label="عنوان الصفحة" name="seo.title" hint={`${s.seo.title.length}/60 حرفاً مثالياً`}>
                  <Input id="s-seo.title" className={inputSm} value={s.seo.title} onChange={(e) => setIn("seo", { title: e.target.value })} />
                </F>
                <F label="الوصف" name="seo.description" hint={`${s.seo.description.length}/160 حرفاً مثالياً`}>
                  <Textarea id="s-seo.description" rows={3} value={s.seo.description} onChange={(e) => setIn("seo", { description: e.target.value })} />
                </F>
                <div className="rounded-xl border border-line bg-white p-4" aria-hidden>
                  <p className="flex items-center gap-2 text-xs text-taupe">
                    <Search className="size-3.5" />
                    معاينة نتيجة البحث
                  </p>
                  <p className="mt-2 truncate text-[1.05rem] text-[#1a0dab]">{s.seo.title || "عنوان الصفحة"}</p>
                  <p className="text-xs text-[#006621]" dir="ltr" style={{ textAlign: "right" }}>
                    marmouq.store
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[0.8rem] leading-5 text-[#545454]">{s.seo.description}</p>
                </div>
              </div>
            </Section>
          </div>

          <div role="tabpanel" id="panel-bars" aria-labelledby="tab-bars" hidden={tab !== "bars"} className="space-y-5">
            <Section
              title="شريط الإعلانات (أعلى المتجر)"
              description="رسائل قصيرة تتناوب أعلى كل الصفحات. الترتيب هنا هو ترتيب الظهور."
              aside={<Switch checked={s.bars.announcement.enabled} onChange={(e) => setBar("announcement", { enabled: e.target.checked })} label="ظاهر" />}
            >
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <F label="اللون" name="bars.announcement.tone">
                  <TonePicker value={s.bars.announcement.tone} onChange={(tone) => setBar("announcement", { tone })} />
                </F>
                <F label="رابط عند الضغط (اختياري)" name="bars.announcement.href" hint="/shop أو رابط كامل">
                  <Input id="s-bars.announcement.href" dir="ltr" className={inputSm} value={s.bars.announcement.href} onChange={(e) => setBar("announcement", { href: e.target.value })} placeholder="/shop" />
                </F>
                <F label="مدة كل رسالة (ثانية)" name="bars.announcement.interval">
                  <Input id="s-bars.announcement.interval" type="number" min={2} max={30} className={inputSm} value={s.bars.announcement.interval} onChange={(e) => setBar("announcement", { interval: Number(e.target.value) || 5 })} />
                </F>
              </div>
              <div className={cn("mb-4 overflow-hidden rounded-lg px-4 py-2 text-center text-[0.72rem]", TONE_PREVIEW[s.bars.announcement.tone])} aria-hidden>
                {s.announcements.length ? s.announcements.join("  ✦  ") : "لن يظهر الشريط"}
              </div>
              <ListEditor
                items={s.announcements}
                onChange={(v) => set("announcements", v)}
                create={() => ""}
                max={8}
                addLabel="إضافة رسالة"
                emptyLabel="لا رسائل — سيختفي الشريط من المتجر."
                itemLabel={(i) => `الرسالة ${i + 1}`}
                render={(item, update, i) => (
                  <>
                    <label htmlFor={`s-ann-${i}`} className="sr-only">{`الرسالة ${i + 1}`}</label>
                    <Input id={`s-ann-${i}`} className="h-10 text-sm" value={item} maxLength={120} onChange={(e) => update(e.target.value)} placeholder="مثلاً: توصيل مجاني للطلبات فوق 60,000 ر.ي" />
                    <ActionFieldError name={`announcements.${i}`} />
                  </>
                )}
              />
            </Section>


            <Section
              title="الشريط المتحرك (الصفحة الرئيسية)"
              description="عبارات قصيرة تتحرك تحت الواجهة الرئيسية — قيم المتجر أو عروضه."
              aside={<Switch checked={s.bars.marquee.enabled} onChange={(e) => setBar("marquee", { enabled: e.target.checked })} label="ظاهر" />}
            >
              <div className={cn("mb-4 overflow-hidden whitespace-nowrap rounded-lg px-4 py-2.5 text-center text-[0.8rem]", TONE_PREVIEW[s.bars.marquee.tone])} aria-hidden>
                {s.bars.marquee.items.length ? s.bars.marquee.items.join("  ✦  ") : "لن يظهر الشريط"}
              </div>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <F label="اللون" name="bars.marquee.tone">
                  <TonePicker value={s.bars.marquee.tone} onChange={(tone) => setBar("marquee", { tone })} />
                </F>
                <F label="سرعة الحركة (ثوانٍ للدورة — الأقل أسرع)" name="bars.marquee.speed">
                  <Input id="s-bars.marquee.speed" type="number" min={10} max={120} className={inputSm} value={s.bars.marquee.speed} onChange={(e) => setBar("marquee", { speed: Number(e.target.value) || 38 })} />
                </F>
              </div>
              <ListEditor
                items={s.bars.marquee.items}
                onChange={(items) => setBar("marquee", { items })}
                create={() => ""}
                max={12}
                addLabel="إضافة عبارة"
                emptyLabel="لا عبارات — سيختفي الشريط."
                itemLabel={(i) => `العبارة ${i + 1}`}
                render={(item, update, i) => (
                  <>
                    <label htmlFor={`s-mq-${i}`} className="sr-only">{`العبارة ${i + 1}`}</label>
                    <Input id={`s-mq-${i}`} className="h-10 text-sm" value={item} maxLength={60} onChange={(e) => update(e.target.value)} placeholder="مثلاً: شحن دولي لدول الخليج" />
                    <ActionFieldError name={`bars.marquee.items.${i}`} />
                  </>
                )}
              />
            </Section>

          </div>

          <div role="tabpanel" id="panel-markets" aria-labelledby="tab-markets" hidden={tab !== "markets"} className="space-y-5">
            <Section
              title="البيع الدولي بعملات متعددة"
              description={`أسعار المنتجات تُدخل وتُحفظ بالعملة الأساسية (${s.currency.code}). أضف عملات للعملاء خارج اليمن، وحدّد سعر الصرف ونسبة إضافية لكل سوق — والمتجر يحوّل كل الأسعار تلقائياً.`}
              aside={<Switch checked={s.markets.switcher} onChange={(e) => setS((p) => ({ ...p, markets: { ...p.markets, switcher: e.target.checked } }))} label="إظهار مبدّل العملة" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="العملة الافتراضية للزوار" name="markets.defaultCode" hint="ما يراه الزائر لأول مرة قبل أن يختار.">
                  <Select id="s-markets.defaultCode" className={inputSm} value={s.markets.defaultCode} onChange={(e) => setS((p) => ({ ...p, markets: { ...p.markets, defaultCode: e.target.value } }))}>
                    <option value="">{`العملة الأساسية (${s.currency.code})`}</option>
                    {s.markets.currencies
                      .filter((c) => c.enabled && c.code)
                      .map((c) => (
                        <option key={c.code} value={c.code}>{`${c.label || c.code} (${c.code})`}</option>
                      ))}
                  </Select>
                </F>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-umber">إضافة سريعة</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CURRENCY_PRESETS.filter((p) => p.code !== s.currency.code && !s.markets.currencies.some((c) => c.code === p.code)).map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setS((prev) => ({ ...prev, markets: { ...prev.markets, currencies: [...prev.markets.currencies, { ...p, basePerUnit: 0, markup: 0, enabled: true }] } }))}
                        className="inline-flex h-8 items-center gap-1 rounded-full bg-bone px-3 text-xs text-umber hover:bg-sand"
                      >
                        <Plus className="size-3" aria-hidden /> {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="العملات" description="لكل عملة: كم تساوي بالعملة الأساسية، ونسبة إضافية اختيارية لذلك السوق (رسوم أو شحن دولي)، وطريقة التقريب.">
              <ListEditor
                items={s.markets.currencies}
                onChange={(currencies) => setS((p) => ({ ...p, markets: { ...p.markets, currencies } }))}
                create={(): MarketCurrency => ({ code: "", symbol: "", label: "", position: "after", basePerUnit: 0, markup: 0, decimals: 0, roundTo: 1, enabled: true })}
                max={12}
                addLabel="إضافة عملة"
                emptyLabel="لا عملات إضافية — المتجر يعرض الأسعار بالعملة الأساسية فقط."
                itemLabel={(i) => `العملة ${i + 1}`}
                render={(c, update, i) => <CurrencyRow c={c} update={update} i={i} base={s.currency} />}
              />
            </Section>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:start-[264px]">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 lg:px-6">
          <div className="flex items-center gap-2">
            <SubmitButton disabled={!dirty} pendingLabel="جارٍ الحفظ…" className="min-w-36">
              حفظ الإعدادات
            </SubmitButton>
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  const base = JSON.parse(saved) as StoreSettings;
                  setS(base);
                  setHero(base.hero.mediaId ? (hero[0]?.id === base.hero.mediaId ? hero : heroMedia && heroMedia.id === base.hero.mediaId ? [heroMedia] : [{ id: base.hero.mediaId }]) : []);
                  setMobileHero(base.hero.mobileMediaId ? (mobileHero[0]?.id === base.hero.mobileMediaId ? mobileHero : [{ id: base.hero.mobileMediaId }]) : []);
                  setErrors({});
                }}
                className="hidden h-10 rounded-full px-4 text-sm text-taupe hover:bg-bone hover:text-espresso sm:inline-flex sm:items-center"
              >
                تراجع
              </button>
            )}
          </div>
          <p className={cn("flex items-center gap-2 text-sm", dirty ? "text-copper-deep" : "text-taupe")} aria-live="polite">
            {dirty ? (
              <>
                <span className="size-2 rounded-full bg-copper" aria-hidden />
                تغييرات غير محفوظة
              </>
            ) : Object.keys(errors).length ? (
              <>
                <CircleAlert className="size-4 text-danger" aria-hidden />
                <span className="text-danger">راجع الحقول المظلّلة</span>
              </>
            ) : (
              "كل التغييرات محفوظة"
            )}
          </p>
        </div>
      </div>
    </ActionForm>
  );
}

/* ─────────── bars & markets helpers ─────────── */

const TONE_PREVIEW: Record<BarTone, string> = {
  espresso: "bg-espresso text-paper/90",
  copper: "bg-copper text-paper",
  burgundy: "bg-burgundy text-paper/90",
  navy: "bg-navy text-paper/90",
  ivory: "bg-bone text-espresso border border-line",
};
const TONE_LABELS: Record<BarTone, string> = { espresso: "إسبريسو", copper: "نحاسي", burgundy: "برغندي", navy: "كحلي", ivory: "عاجي" };

function TonePicker({ value, onChange }: { value: BarTone; onChange: (t: BarTone) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {(Object.keys(TONE_PREVIEW) as BarTone[]).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          title={TONE_LABELS[t]}
          onClick={() => onChange(t)}
          className={cn("size-9 rounded-full ring-offset-2 ring-offset-paper transition-shadow", TONE_PREVIEW[t], value === t ? "ring-2 ring-copper" : "ring-1 ring-line")}
        >
          <span className="sr-only">{TONE_LABELS[t]}</span>
        </button>
      ))}
    </div>
  );
}


const CURRENCY_PRESETS: Omit<MarketCurrency, "basePerUnit" | "markup" | "enabled">[] = [
  { code: "SAR", symbol: "ر.س", label: "ريال سعودي", position: "after", decimals: 0, roundTo: 1 },
  { code: "AED", symbol: "د.إ", label: "درهم إماراتي", position: "after", decimals: 0, roundTo: 1 },
  { code: "OMR", symbol: "ر.ع", label: "ريال عماني", position: "after", decimals: 2, roundTo: 0 },
  { code: "QAR", symbol: "ر.ق", label: "ريال قطري", position: "after", decimals: 0, roundTo: 1 },
  { code: "KWD", symbol: "د.ك", label: "دينار كويتي", position: "after", decimals: 2, roundTo: 0 },
  { code: "BHD", symbol: "د.ب", label: "دينار بحريني", position: "after", decimals: 2, roundTo: 0 },
  { code: "USD", symbol: "$", label: "دولار أمريكي", position: "before", decimals: 2, roundTo: 0 },
  { code: "EUR", symbol: "€", label: "يورو", position: "before", decimals: 2, roundTo: 0 },
  { code: "GBP", symbol: "£", label: "جنيه إسترليني", position: "before", decimals: 2, roundTo: 0 },
  { code: "EGP", symbol: "ج.م", label: "جنيه مصري", position: "after", decimals: 0, roundTo: 5 },
  { code: "YER", symbol: "ر.ي", label: "ريال يمني", position: "after", decimals: 0, roundTo: 1 },
];

function CurrencyRow({ c, update, i, base }: { c: MarketCurrency; update: (next: MarketCurrency) => void; i: number; base: Currency }) {
  const sample = 25000;
  const preview: Currency = { code: c.code, symbol: c.symbol || c.code, position: c.position, basePerUnit: c.basePerUnit, markup: c.markup, decimals: c.decimals, roundTo: c.roundTo };
  const p = `markets.currencies.${i}`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label htmlFor={`s-${p}.code`} className="mb-1 block text-xs text-taupe">الرمز</label>
          <Input id={`s-${p}.code`} dir="ltr" className="h-10 text-sm uppercase" maxLength={3} value={c.code} onChange={(e) => update({ ...c, code: e.target.value.toUpperCase() })} placeholder="SAR" />
          <ActionFieldError name={`${p}.code`} />
        </div>
        <div>
          <label htmlFor={`s-${p}.symbol`} className="mb-1 block text-xs text-taupe">العلامة</label>
          <Input id={`s-${p}.symbol`} className="h-10 text-sm" maxLength={8} value={c.symbol} onChange={(e) => update({ ...c, symbol: e.target.value })} placeholder="ر.س" />
          <ActionFieldError name={`${p}.symbol`} />
        </div>
        <div className="col-span-2">
          <label htmlFor={`s-${p}.label`} className="mb-1 block text-xs text-taupe">الاسم الظاهر للعميل</label>
          <Input id={`s-${p}.label`} className="h-10 text-sm" maxLength={30} value={c.label} onChange={(e) => update({ ...c, label: e.target.value })} placeholder="ريال سعودي" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2">
          <label htmlFor={`s-${p}.basePerUnit`} className="mb-1 block text-xs text-taupe">{`سعر الصرف: 1 ${c.code || "…"} = كم ${base.symbol}`}</label>
          <Input id={`s-${p}.basePerUnit`} type="number" min={0} step="any" className="h-10 text-sm" value={c.basePerUnit || ""} onChange={(e) => update({ ...c, basePerUnit: Number(e.target.value) || 0 })} placeholder="140" />
          <ActionFieldError name={`${p}.basePerUnit`} />
        </div>
        <div>
          <label htmlFor={`s-${p}.markup`} className="mb-1 block text-xs text-taupe">نسبة إضافية %</label>
          <Input id={`s-${p}.markup`} type="number" step="any" className="h-10 text-sm" value={c.markup} onChange={(e) => update({ ...c, markup: Number(e.target.value) || 0 })} />
          <ActionFieldError name={`${p}.markup`} />
        </div>
        <div>
          <label htmlFor={`s-${p}.round`} className="mb-1 block text-xs text-taupe">التقريب</label>
          <Select
            id={`s-${p}.round`}
            className="h-10 text-sm"
            value={`${c.decimals}:${c.roundTo}`}
            onChange={(e) => {
              const [d, r] = e.target.value.split(":").map(Number);
              update({ ...c, decimals: d === 2 ? 2 : 0, roundTo: r });
            }}
          >
            <option value="2:0">بالهللات (12.50)</option>
            <option value="0:1">لأقرب 1</option>
            <option value="0:5">لأقرب 5</option>
            <option value="0:10">لأقرب 10</option>
            <option value="0:50">لأقرب 50</option>
            <option value="0:100">لأقرب 100</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Switch checked={c.enabled} onChange={(e) => update({ ...c, enabled: e.target.checked })} label="مفعّلة" />
          <Select className="h-9 w-36 text-xs" value={c.position} onChange={(e) => update({ ...c, position: e.target.value as "after" | "before" })} aria-label="موضع العلامة">
            <option value="after">العلامة بعد الرقم</option>
            <option value="before">العلامة قبل الرقم</option>
          </Select>
        </div>
        <p className="text-xs text-taupe">
          {c.basePerUnit > 0 ? (
            <>
              منتج بـ {formatMoney(sample, base)} يظهر: <span className="font-semibold text-espresso">{formatMoney(sample, preview)}</span>
            </>
          ) : (
            "أدخل سعر الصرف لرؤية المعاينة"
          )}
        </p>
      </div>
    </div>
  );
}
