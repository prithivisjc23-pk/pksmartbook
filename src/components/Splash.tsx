import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function Splash() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");
  useEffect(() => {
    if (sessionStorage.getItem("pk-splash")) { setPhase("gone"); return; }
    const a = setTimeout(() => setPhase("fade"), 1800);
    const b = setTimeout(() => { setPhase("gone"); sessionStorage.setItem("pk-splash", "1"); }, 2300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (phase === "gone") return null;
  return (
    <div aria-hidden className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-hero text-primary-foreground transition-opacity duration-500 ${phase === "fade" ? "opacity-0" : "opacity-100"}`}>
      <div className="splash-logo font-display text-4xl font-bold md:text-5xl">
        PK <span className="text-accent">SmartBook</span> AI
      </div>
      <div className="mt-8 h-8 w-8 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
      <p className="mt-3 text-sm opacity-80">{t("syncing")}</p>
    </div>
  );
}
