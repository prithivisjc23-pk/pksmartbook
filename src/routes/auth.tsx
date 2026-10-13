import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SolluBook AI" },
      { name: "description", content: "Sign in or create your SolluBook AI shop account." },
      { property: "og:title", content: "Sign in — SolluBook AI" },
      { property: "og:description", content: "Sign in or create your SolluBook AI shop account." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  component: AuthPage,
});

const allowed = ["/dashboard", "/records", "/customers", "/inventory", "/admin"] as const;
type Dest = (typeof allowed)[number];

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { redirect: r } = Route.useSearch();
  const dest: Dest = (allowed as readonly string[]).includes(r ?? "") ? (r as Dest) : "/dashboard";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ email: "", password: "", full_name: "", shop_name: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: dest }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: dest }));
    return () => data.subscription.unsubscribe();
  }, [navigate, dest]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: { emailRedirectTo: window.location.origin + dest, data: { full_name: f.full_name, shop_name: f.shop_name } },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success(t("checkEmail"));
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hero p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-soft md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold text-primary">
            Sollu<span className="text-accent">Book</span>
          </Link>
          <LangToggle />
        </div>
        <h1 className="mb-4 text-2xl font-bold">{mode === "in" ? t("signIn") : t("signUp")}</h1>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <>
              <Field label={t("fullName")} value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} />
              <Field label={t("shopName")} value={f.shop_name} onChange={(v) => setF({ ...f, shop_name: v })} />
            </>
          )}
          <Field label={t("email")} type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} required />
          <Field label={t("password")} type="password" value={f.password} onChange={(v) => setF({ ...f, password: v })} required />
          <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">
            {mode === "in" ? t("signIn") : t("signUp")}
          </Button>
        </form>
        <Button variant="outline" onClick={google} className="mt-3 h-11 w-full rounded-full">{t("google")}</Button>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-center text-sm text-primary underline-offset-4 hover:underline">
          {mode === "in" ? t("noAccount") : t("haveAccount")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} required={required} minLength={type === "password" ? 6 : undefined} onChange={(e) => onChange(e.target.value)} className="h-11" />
    </div>
  );
}
