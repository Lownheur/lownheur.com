import { Link } from "@/i18n/navigation";

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="Lownheur, accueil">
      <span className="logo-mark" aria-hidden="true">
        L
      </span>
      <span>Lownheur</span>
    </Link>
  );
}
