import Link from "next/link";

export function NotFoundView({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref
}: {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: "/fr" | "/en";
  secondaryLabel?: string;
  secondaryHref?: "/fr" | "/en";
}) {
  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <Link className="logo" href={primaryHref} aria-label="Lownheur">
          <span className="logo-mark" aria-hidden="true">L</span>
          <span>Lownheur</span>
        </Link>
        <span className="not-found-code">404</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="not-found-actions">
          <Link className="button button-primary" href={primaryHref}>{primaryLabel}</Link>
          {secondaryLabel && secondaryHref ? (
            <Link className="button button-ghost" href={secondaryHref}>{secondaryLabel}</Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
