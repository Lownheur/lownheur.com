import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Autorisation · Lownheur",
  robots: { index: false, follow: false }
};

export default function OAuthLayout({ children }: { children: React.ReactNode }) {
  const themeScript = "(function(){try{var t=localStorage.getItem('lownheur-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}})()";
  return <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth"><body><script dangerouslySetInnerHTML={{ __html: themeScript }} />{children}</body></html>;
}
