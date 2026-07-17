import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const user = await requireUser(locale);

  return (
    <DashboardShell locale={locale} user={user}>
      {children}
    </DashboardShell>
  );
}
