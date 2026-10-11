import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { looks, media } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { MediaImage, type MediaLike } from "@/components/ui/media-image";
import { Wordmark } from "@/components/ui/wordmark";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تسجيل الدخول · لوحة التحكم",
  robots: { index: false, follow: false },
};

type Cover = MediaLike & { caption: string | null };

/** Brand image: the first active look cover, else the hero image from settings. Never selects image bytes. */
async function getCover(heroMediaId: string | null): Promise<Cover | null> {
  try {
    const cols = { id: media.id, blur: media.blur, width: media.width, height: media.height, alt: media.alt };
    const [look] = await db
      .select({ ...cols, caption: looks.title })
      .from(looks)
      .innerJoin(media, eq(media.id, looks.coverId))
      .where(and(eq(looks.isActive, true), isNotNull(looks.coverId)))
      .orderBy(asc(looks.sortOrder), asc(looks.id))
      .limit(1);
    if (look) return look;
    if (heroMediaId) {
      const [hero] = await db.select(cols).from(media).where(eq(media.id, heroMediaId)).limit(1);
      if (hero) return { ...hero, caption: null };
    }
  } catch (err) {
    console.error("[admin login] cover", err);
  }
  return null;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; out?: string }> }) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { next, out } = await searchParams;
  const settings = await getSettings();
  const cover = await getCover(settings.hero.mediaId);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-ivory lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ── Form column ── */}
      <div className="relative flex min-h-dvh flex-col">
        {/* phone: cinematic brand band */}
        <div className="grain relative h-[34vh] min-h-[230px] overflow-hidden bg-espresso lg:hidden">
          {cover && <MediaImage media={cover} alt="" sizes="100vw" priority className="absolute inset-0" imgClassName="animate-slow-zoom object-[50%_30%] opacity-80" />}
          <div className="absolute inset-0 bg-gradient-to-b from-espresso/30 via-espresso/40 to-espresso/90" aria-hidden />
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 pb-6 text-center">
            <Wordmark tone="light" size="md" />
            <p className="text-[0.8rem] text-paper/70">{settings.tagline}</p>
          </div>
        </div>

        <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-ivory px-6 pb-6 pt-9 sm:px-10 lg:mt-0 lg:rounded-none lg:px-14 lg:pt-10 xl:px-20">
          <div className="hidden items-center justify-between lg:flex">
            <Link href="/" aria-label="مرموق — الصفحة الرئيسية للمتجر" className="rounded">
              <Wordmark size="sm" />
            </Link>
            <Link href="/" className="group inline-flex items-center gap-2 text-sm text-taupe transition-colors hover:text-espresso">
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
              العودة إلى المتجر
            </Link>
          </div>

          <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-4 lg:py-12">
            <p className="eyebrow animate-fade-up">Back office</p>
            <h1 className="display mt-3 animate-fade-up text-[2rem] text-espresso [animation-delay:60ms] md:text-[2.4rem]">أهلاً بعودتك</h1>
            <p className="mt-2.5 animate-fade-up text-[0.95rem] leading-relaxed text-taupe [animation-delay:120ms]">
              سجّل دخولك لمتابعة الطلبات، وإدارة القطع، وتنسيق إطلالات مرموق.
            </p>

            {out === "1" && (
              <p role="status" className="mt-6 rounded-xl border border-success/20 bg-success/[0.06] px-4 py-3 text-sm text-success">
                تم تسجيل خروجك بأمان. نراك قريباً.
              </p>
            )}

            <div className="mt-8 animate-fade-up [animation-delay:180ms]">
              <LoginForm next={next} />
            </div>

            <div className="mt-8 flex items-start gap-3 border-t border-line pt-6 text-xs leading-relaxed text-taupe">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-copper" aria-hidden />
              <p>
                مساحة خاصة بفريق مرموق. نسيت كلمة المرور؟ تواصل مع مالك المتجر لإعادة تعيينها من صفحة الفريق.
              </p>
            </div>
          </main>

          <footer className="mx-auto flex w-full max-w-[400px] items-center justify-between gap-4 text-[0.72rem] text-mist">
            <span className="font-[family-name:var(--font-latin)] tracking-[0.2em]">© {year} MARMOUQ</span>
            <Link href="/" className="transition-colors hover:text-espresso lg:hidden">
              العودة إلى المتجر
            </Link>
          </footer>
        </div>
      </div>

      {/* ── Brand column (desktop) ── */}
      <aside className="grain relative hidden overflow-hidden bg-espresso lg:block" aria-label="مرموق">
        {cover ? (
          <MediaImage media={cover} alt={cover.alt || cover.caption || ""} sizes="55vw" priority className="absolute inset-0" imgClassName="animate-slow-zoom object-[50%_25%]" />
        ) : (
          <div className="absolute inset-0 grid place-items-center" aria-hidden>
            <span className="font-[family-name:var(--font-latin)] text-[22rem] italic leading-none text-copper/15">M</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/35 to-espresso/10" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-espresso/25" aria-hidden />

        <div className="relative z-10 flex h-full min-h-dvh flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center justify-between text-paper/70">
            <span className="eyebrow !text-copper-soft">Maison Marmouq</span>
            <span className="font-[family-name:var(--font-latin)] text-xs tracking-[0.3em]">EST. YEMEN</span>
          </div>

          <div className="max-w-md">
            <p className="latin-italic text-lg text-copper-soft">The art of quiet distinction</p>
            <p className="display mt-3 whitespace-pre-line text-[2.6rem] leading-[1.25] text-paper xl:text-[3rem]">{"طريقك لتكون\nشخصية مرموقة"}</p>
            <div className="hairline mt-8 w-40 opacity-70" />
            <p className="mt-6 text-sm leading-relaxed text-paper/65">
              {cover?.caption ? `من إطلالة «${cover.caption}» — ` : ""}كل طلب يُستقبل هنا يُجهَّز ويُغلَّف بعناية، تماماً كما يليق بعملائنا.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
