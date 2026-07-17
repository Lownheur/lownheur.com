import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AppLocale } from "@/i18n/routing";

const documents = {
  privacy: [
    "controller",
    "data",
    "purposes",
    "legalBases",
    "retention",
    "rights",
    "security"
  ],
  terms: [
    "service",
    "account",
    "acceptableUse",
    "subscriptions",
    "cancellation",
    "liability",
    "changes"
  ],
  legal: ["publisher", "hosting", "intellectualProperty", "contact"],
  support: ["contact", "response", "security", "accountDeletion"]
} as const;

type DocumentName = keyof typeof documents;

function isDocument(value: string): value is DocumentName {
  return value in documents;
}

function ownerValues(notConfigured: string) {
  return {
    legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? notConfigured,
    legalAddress: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? notConfigured,
    registration: process.env.NEXT_PUBLIC_LEGAL_REGISTRATION ?? notConfigured,
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? notConfigured,
    refundPolicy: process.env.NEXT_PUBLIC_REFUND_POLICY ?? notConfigured,
    hostingDetails: process.env.NEXT_PUBLIC_HOSTING_DETAILS ?? notConfigured
  };
}

export function generateStaticParams() {
  return Object.keys(documents).map((document) => ({ document }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: AppLocale; document: string }>;
}): Promise<Metadata> {
  const { locale, document } = await params;
  if (!isDocument(document)) return {};
  const t = await getTranslations({ locale, namespace: "InfoPages" });
  return {
    title: t(`${document}.title`),
    description: t(`${document}.description`)
  };
}

export default async function InformationPage({
  params
}: {
  params: Promise<{ locale: AppLocale; document: string }>;
}) {
  const { locale, document } = await params;
  if (!isDocument(document)) notFound();
  const t = await getTranslations({ locale, namespace: "InfoPages" });
  const values = ownerValues(t("notConfigured"));

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="info-main">
        <article className="container info-document">
          <header>
            <span className="eyebrow">{t("eyebrow")}</span>
            <h1>{t(`${document}.title`)}</h1>
            <p>{t(`${document}.description`)}</p>
            <small>{t("updated")}</small>
          </header>
          {documents[document].map((section) => (
            <section key={section}>
              <h2>
                {t(`${document}.sections.${section}.title`)}
              </h2>
              <p>
                {t(`${document}.sections.${section}.body`, values)}
              </p>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}