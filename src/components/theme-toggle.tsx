"use client";

import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const t = useTranslations("Common");

  function toggleTheme() {
    const current =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("lownheur-theme", next);
  }

  return (
    <button
      className="icon-button"
      type="button"
      onClick={toggleTheme}
      aria-label={t("theme")}
      title={t("theme")}
    >
      <span aria-hidden="true">◐</span>
    </button>
  );
}
