import type { AppLocale } from "@/i18n/routing";

const publicSegments = new Set([
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "privacy",
  "terms",
  "legal",
  "support"
]);

const dashboardSegments = new Set([
  "categories",
  "events",
  "goals",
  "schedules",
  "connections",
  "settings",
  "usage"
]);

const technicalPaths = new Set(["/oauth/consent"]);

export function isKnownUnlocalizedPath(pathname: string) {
  return pathname === "/" || technicalPaths.has(pathname);
}

export function localizedPath(pathname: string): { locale: AppLocale; known: boolean } | null {
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] === "en" ? "en" : segments[0] === "fr" ? "fr" : null;
  if (!locale) return null;
  const rest = segments.slice(1);
  if (rest.length === 0) return { locale, known: true };
  if (rest.length === 1 && publicSegments.has(rest[0])) return { locale, known: true };
  if (rest[0] === "dashboard") {
    return {
      locale,
      known: rest.length === 1 || (rest.length === 2 && dashboardSegments.has(rest[1]))
    };
  }
  return { locale, known: false };
}

export function notFoundHtml(locale: AppLocale) {
  const english = locale === "en";
  const title = english ? "Page not found" : "Page introuvable";
  const description = english
    ? "This address does not exist or has moved. Return to the Lownheur home page."
    : "Cette adresse n’existe pas ou a été déplacée. Revenez à l’accueil Lownheur.";
  const action = english ? "Back to home" : "Revenir à l’accueil";
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>404 — Lownheur</title>
  <style>
    :root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f4f7f2;color:#142218}
    *{box-sizing:border-box}body{margin:0}.page{min-height:100vh;display:grid;place-items:center;padding:clamp(16px,5vw,64px);background:radial-gradient(circle at 15% 20%,#d9efdf,transparent 34rem)}
    .card{width:min(100%,672px);display:grid;gap:20px;padding:clamp(24px,6vw,64px);border:1px solid #d7dfd8;border-radius:28px;background:#fff;box-shadow:0 24px 70px #16261a1f}
    .logo{display:flex;align-items:center;gap:10px;width:max-content;color:inherit;text-decoration:none;font-weight:850}.mark{display:grid;width:40px;height:40px;place-items:center;border-radius:12px;color:#fff;background:#237a45}
    .code{color:#237a45;font-size:clamp(64px,18vw,144px);font-weight:950;line-height:.8;letter-spacing:-.08em}h1{margin:0;font-size:clamp(32px,7vw,64px);line-height:1;letter-spacing:-.055em}p{max-width:560px;margin:0;color:#5e6d62;line-height:1.6}
    .button{width:max-content;padding:12px 18px;border-radius:12px;color:#fff;background:#237a45;text-decoration:none;font-weight:800}
    @media(prefers-color-scheme:dark){:root{background:#0d1510;color:#eef7f0}.page{background:radial-gradient(circle at 15% 20%,#173e25,transparent 34rem)}.card{border-color:#2b3a2f;background:#131e16}.mark,.button{background:#54b875}.code{color:#6dcc88}p{color:#aebbb1}}
  </style>
</head>
<body><main class="page"><section class="card"><a class="logo" href="/${locale}"><span class="mark">L</span><span>Lownheur</span></a><span class="code">404</span><h1>${title}</h1><p>${description}</p><a class="button" href="/${locale}">${action}</a></section></main></body>
</html>`;
}
