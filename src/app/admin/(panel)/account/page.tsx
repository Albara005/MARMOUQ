import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Avatar, Card, PageHeader, RoleBadge } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/ui-client";
import { logoutAction } from "@/app/admin/actions";
import { PasswordForm, ProfileForm } from "./account-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حسابي" };

export default async function AccountPage() {
  const me = await requireAdmin();
  const row = await db.query.admins.findFirst({ where: eq(admins.id, me.id), columns: { createdAt: true, lastLoginAt: true } });

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader eyebrow="ACCOUNT" title="حسابي" description="بياناتك وكلمة مرورك في لوحة تحكم مرموق." />

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
        <aside className="grain relative overflow-hidden rounded-2xl bg-espresso p-6 text-paper">
          <div className="relative z-10">
            <Avatar name={me.name} className="size-16 bg-paper/10 text-xl text-copper-soft" />
            <p className="display mt-4 text-xl">{me.name}</p>
            <p className="mt-1 truncate text-sm text-paper/60" dir="ltr" style={{ textAlign: "right" }}>
              {me.email}
            </p>
            <div className="mt-4">
              <RoleBadge role={me.role} />
            </div>
            <dl className="mt-6 space-y-2 border-t border-paper/10 pt-5 text-sm">
              {row?.createdAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-paper/55">عضو منذ</dt>
                  <dd>{formatDate(row.createdAt)}</dd>
                </div>
              )}
              {row?.lastLoginAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-paper/55">آخر دخول</dt>
                  <dd>{formatDateTime(row.lastLoginAt)}</dd>
                </div>
              )}
            </dl>
            <form action={logoutAction} className="mt-6">
              <SubmitButton variant="light" size="sm" className="w-full" pendingLabel="جارٍ الخروج…">
                <LogOut className="size-4" aria-hidden />
                تسجيل الخروج من هذا الجهاز
              </SubmitButton>
            </form>
          </div>
        </aside>

        <div className="min-w-0 space-y-5 md:space-y-6">
          <Card title="البيانات الشخصية" description="يظهر اسمك في سجل الطلبات بجانب كل إجراء تقوم به.">
            <ProfileForm name={me.name} email={me.email} />
          </Card>
          <Card title="كلمة المرور" description="ننصح بتغيير كلمة المرور المؤقتة فور أول دخول.">
            <PasswordForm />
          </Card>
        </div>
      </div>
    </div>
  );
}
