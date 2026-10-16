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
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  component: AuthPage,
});

const allowed = ["/dashboard", "/records", "/customers", "/inventory", "/settings", "/admin"] as const;
type Dest = (typeof allowed)[number];
/** 10-digit Indian mobile → +91XXXXXXXXXX */
export const toE164 = (m: string) => "+91" + m.replace(/\D/g, "").slice(-10);

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { redirect: r } = Route.useSearch();
  const dest: Dest = (allowed as readonly string[]).includes(r ?? "") ? (r as Dest) : "/dashboard";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [step, setStep] = useState<"form" | "otp" | "password">("form");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ mobile: "", password: "", full_name: "", shop_name: "", join_shop: "", otp: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: dest }));
  }, [navigate, dest]);

  const valid = f.mobile.replace(/\D/g, "").length >= 10;

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    if (err) toast.error(err);
  }

  const login = () => run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ phone: toE164(f.mobile), password: f.password });
    if (error) return t("wrongLogin");
    navigate({ to: dest }); return null;
  });
  const sendOtp = () => run(async () => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: toE164(f.mobile),
      options: { data: { full_name: f.full_name, shop_name: f.shop_name, join_shop: f.join_shop.trim() } },
    });
    if (error) return error.message;
    toast.success(t("otpSent")); setStep("otp"); return null;
  });
  const verify = () => run(async () => {
    const { error } = await supabase.auth.verifyOtp({ phone: toE164(f.mobile), token: f.otp.trim(), type: "sms" });
    if (error) return error.message;
    setStep("password"); return null;
  });
  const setPw = () => run(async () => {
    const { error } = await supabase.auth.updateUser({ password: f.password });
    if (error) return error.message;
    navigate({ to: "/dashboard" }); return null;
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "in") return login();
    if (step === "form") return sendOtp();
    if (step === "otp") return verify();
    return setPw();
  }

  const label = mode === "in" ? t("signIn") : step === "form" ? t("sendOtp") : step === "otp" ? t("verify") : t("save");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hero p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-soft md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold text-primary">
            PK <span className="text-accent">SmartBook</span>
          </Link>
          <LangToggle />
        </div>
        <h1 className="mb-4 text-2xl font-bold">{mode === "in" ? t("signIn") : step === "password" ? t("setPassword") : t("signUp")}</h1>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && step === "form" && (
            <>
              <Field label={t("fullName")} value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} required />
              <Field label={t("shopName")} value={f.shop_name} onChange={(v) => setF({ ...f, shop_name: v })} />
            </>
          )}
          {step !== "password" && (
            <div className="space-y-1">
              <Label>{t("mobile")}</Label>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm">+91</span>
                <Input type="tel" inputMode="numeric" maxLength={10} required disabled={step === "otp"} value={f.mobile}
                  onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, "") })} className="h-12 rounded-l-none text-lg" />
              </div>
            </div>
          )}
          {mode === "up" && step === "form" && (
            <Field label={t("joinShop")} value={f.join_shop} onChange={(v) => setF({ ...f, join_shop: v })} />
          )}
          {mode === "up" && step === "otp" && (
            <Field label={t("otp")} value={f.otp} onChange={(v) => setF({ ...f, otp: v.replace(/\D/g, "") })} required />
          )}
          {(mode === "in" || step === "password") && (
            <Field label={mode === "in" ? t("password") : t("newPassword")} type="password" value={f.password} onChange={(v) => setF({ ...f, password: v })} required />
          )}
          <Button type="submit" disabled={busy || (step !== "password" && !valid)} className="h-12 w-full rounded-full text-base">{label}</Button>
        </form>
        {step === "otp" && (
          <button onClick={() => setStep("form")} className="mt-3 w-full text-center text-sm text-muted-foreground">{t("changeNumber")}</button>
        )}
        {step === "form" && (
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-center text-sm text-primary underline-offset-4 hover:underline">
            {mode === "in" ? t("noAccount") : t("haveAccount")}
          </button>
        )}
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
