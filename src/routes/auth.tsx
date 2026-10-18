import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login — PK SmartBook" },
      { name: "description", content: "Log in to PK SmartBook with your mobile number." },
      { property: "og:title", content: "Login — PK SmartBook" },
      { property: "og:description", content: "Log in to PK SmartBook with your mobile number." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  component: AuthPage,
});

const allowed = ["/dashboard", "/records", "/customers", "/inventory", "/settings", "/admin"] as const;
type Dest = (typeof allowed)[number];
/** Login id for a mobile number: last 10 digits @pksmartbook.app (never shown to users). */
export const mobileEmail = (m: string) => m.replace(/\D/g, "").slice(-10) + "@pksmartbook.app";

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { redirect: r } = Route.useSearch();
  const dest: Dest = (allowed as readonly string[]).includes(r ?? "") ? (r as Dest) : "/dashboard";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [kind, setKind] = useState<"shop" | "personal">("shop");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ mobile: "", password: "", confirm: "", full_name: "", shop_name: "", district: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: dest }));
  }, [navigate, dest]);

  const valid = f.mobile.replace(/\D/g, "").length === 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "up" && f.password !== f.confirm) { toast.error(t("pwMismatch")); return; }
    setBusy(true);
    const email = mobileEmail(f.mobile);
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password: f.password })
      : await supabase.auth.signUp({ email, password: f.password, options: { data: {
          full_name: f.full_name, district: f.district, account_type: kind, shop_name: kind === "shop" ? f.shop_name : null } } });
    setBusy(false);
    if (error) { toast.error(mode === "in" ? t("wrongLogin") : error.message); return; }
    navigate({ to: mode === "in" ? dest : "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hero p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-soft md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold text-primary">
            PK <span className="text-accent">SmartBook</span>
          </Link>
          <LangToggle />
        </div>
        <h1 className="mb-4 text-2xl font-bold">{mode === "in" ? t("signIn") : t("signUp")}</h1>
        {mode === "up" && (
          <div className="mb-4 grid grid-cols-2 rounded-full border p-1">
            {([["shop", t("shopkeeper")], ["personal", t("personalUser")]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`rounded-full py-2 text-sm font-semibold ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && <Field label={t("fullName")} value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} required />}
          {mode === "up" && kind === "shop" && <Field label={t("shopName")} value={f.shop_name} onChange={(v) => setF({ ...f, shop_name: v })} required />}
          <div className="space-y-1">
            <Label>{t("mobile")}</Label>
            <div className="flex">
              <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm">+91</span>
              <Input type="tel" inputMode="numeric" maxLength={10} required value={f.mobile}
                onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, "") })} className="h-12 rounded-l-none text-lg" />
            </div>
          </div>
          {mode === "up" && <Field label={t("district")} value={f.district} onChange={(v) => setF({ ...f, district: v })} required />}
          <Field label={mode === "in" ? t("password") : t("newPassword")} type="password" value={f.password} onChange={(v) => setF({ ...f, password: v })} required />
          {mode === "up" && <Field label={t("confirmPassword")} type="password" value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} required />}
          <Button type="submit" disabled={busy || !valid} className="h-12 w-full rounded-full text-base">{mode === "in" ? t("signIn") : t("signUp")}</Button>
        </form>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-center text-sm text-primary underline-offset-4 hover:underline">
          {mode === "in" ? t("noAccount") : t("haveAccount")}
        </button>
      </div>
      <p className="mt-6 text-sm font-semibold text-primary-foreground/90">{t("poweredBy")}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} required={required} minLength={type === "password" ? 6 : undefined} onChange={(e) => onChange(e.target.value)} className="h-12" />
    </div>
  );
}
