import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem("theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light" | null) ?? "dark";
    setTheme(saved);
    applyTheme(saved);
  }, []);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

export function LanguageToggle() {
  const { i18n } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        const next = i18n.language?.startsWith("ru") ? "en" : "ru";
        i18n.changeLanguage(next);
      }}
      aria-label="Toggle language"
    >
      <Languages className="h-5 w-5" />
      <span className="sr-only">{i18n.language?.toUpperCase()}</span>
    </Button>
  );
}
