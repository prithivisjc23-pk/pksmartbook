import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Users, Package, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SolluBook AI — Simple accounts for Indian shops" },
      { name: "description", content: "Track sales, expenses, customer dues and stock in Tamil or English. Built for small shop owners." },
      { property: "og:title", content: "SolluBook AI — Simple accounts for Indian shops" },
      { property: "og:description", content: "Track sales, expenses, customer dues and stock in Tamil or English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const features = [
    { icon: TrendingUp, label: `${t("sales")} & ${t("expenses")}` },
    { icon: Users, label: t("pending") },
    { icon: Package, label: t("lowStock") },
    { icon: Languages, label: "English · தமிழ்" },
  ];
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="font-display text-2xl font-bold text-primary">
          Sollu<span className="text-accent">Book</span> AI
        </span>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button asChild variant="ghost"><Link to="/auth">{t("signIn")}</Link></Button>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="text-4xl font-bold leading-tight text-primary md:text-6xl">{t("tagline")}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t("heroText")}</p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-full px-8 text-base shadow-soft">
            <Link to="/auth">{t("getStarted")}</Link>
          </Button>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium">
                <f.icon className="h-5 w-5 text-accent" /> {f.label}
              </div>
            ))}
          </div>
        </div>
        <img src={hero} alt="Shop owner using SolluBook on a phone" className="w-full rounded-3xl shadow-soft" width={1280} height={960} />
      </section>
    </div>
  );
}
