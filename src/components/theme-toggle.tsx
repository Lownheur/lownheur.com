"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const t = useTranslations("Common");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light"
      );
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("lownheur-theme", next);
    setTheme(next);
  }

  return (
    <button
      className="icon-button"
      type="button"
      onClick={toggleTheme}
      aria-label={t("theme")}
      aria-pressed={theme === "dark"}
      title={t("theme")}
      data-ready={ready ? "true" : "false"}
    >
      <span aria-hidden="true">{theme === "dark" ? "\u263e" : "\u25d0"}</span>
    </button>
  );
}