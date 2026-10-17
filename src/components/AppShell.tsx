import { useEffect } from "react";
import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ReceiptIndianRupee, Users, Package, ShieldCheck, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { profileQuery } from "@/lib/data";
import { LangToggle } from "./LangToggle";

export function AppShell() {
  const { t } = useI18n();
  const { isAdmin, role } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery).data;
  const owner = role === "owner";
  const personal = profile?.account_type === "personal";

  // Live sync: any change to records, customers or stock refreshes every screen.
  useEffect(() => {
    const ch = supabase
      .channel("shop-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        qc.invalidateQueries({ queryKey: ["txns"] });
        qc.invalidateQueries({ queryKey: ["customers"] });
        qc.invalidateQueries({ queryKey: ["products"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => qc.invalidateQueries({ queryKey: ["customers"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => qc.invalidateQueries({ queryKey: ["products"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const nav = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/records", label: t("records"), icon: ReceiptIndianRupee },
    ...(!personal ? [{ to: "/customers", label: t("customers"), icon: Users }] as const : []),
    ...(owner && !personal ? [{ to: "/inventory", label: t("inventory"), icon: Package }] as const : []),
    { to: "/settings", label: t("settings"), icon: Settings },
    ...(isAdmin ? [{ to: "/admin", label: t("admin"), icon: ShieldCheck }] as const : []),
  ];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const brand = profile?.shop_name || t("appName");
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-8 px-2 font-display text-2xl font-bold">
          PK <span className="text-sidebar-primary">SmartBook</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}>
              <n.icon className="h-5 w-5" /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-sidebar-accent">
          <LogOut className="h-5 w-5" /> {t("signOut")}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-3 md:px-8">
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold leading-tight">{brand}</div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={signOut} className="rounded-full p-2 text-muted-foreground md:hidden" aria-label={t("signOut")}>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-semibold" }}>
            <n.icon className="h-5 w-5" />
            <span className="truncate">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
