import { useI18n } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex rounded-full border bg-card p-0.5 text-sm">
      {(["en", "ta"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {l === "en" ? "English" : "தமிழ்"}
        </button>
      ))}
    </div>
  );
}
