import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ReceiptIndianRupee, Users, Package, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";

export function AppShell() {
  const { t } = useI18n();
  const { isAdmin } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const nav = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/records", label: t("records"), icon: ReceiptIndianRupee },
    { to: "/customers", label: t("customers"), icon: Users },
    { to: "/inventory", label: t("inventory"), icon: Package },
    ...(isAdmin ? [{ to: "/admin", label: t("admin"), icon: ShieldCheck }] : []),
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-8 px-2 font-display text-2xl font-bold">
          PK <span className="text-sidebar-primary">SmartBook</span> AI
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
            >
              <n.icon className="h-5 w-5" /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-sidebar-accent">
          <LogOut className="h-5 w-5" /> {t("signOut")}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="flex items-center justify-between gap-2 border-b bg-card px-4 py-3 md:px-8">
          <span className="font-display text-xl font-bold md:invisible">
            PK <span className="text-accent">SmartBook</span> AI
          </span>
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
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <n.icon className="h-5 w-5" />
            <span className="truncate">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
