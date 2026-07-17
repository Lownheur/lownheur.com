import { Logo } from "./logo";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p>© {new Date().getFullYear()} Lownheur. Tous droits réservés.</p>
        </div>
        <nav className="footer-links" aria-label="Informations légales">
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/terms">CGU</Link>
          <Link href="/support">Support</Link>
        </nav>
      </div>
    </footer>
  );
}
