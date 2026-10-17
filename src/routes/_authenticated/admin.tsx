import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, inr } from "@/lib/i18n";
import { ymd } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => { if (!context.isAdmin) throw redirect({ to: "/dashboard" }); },
  head: () => ({ meta: [{ title: "Super Admin — PK SmartBook" }, { name: "description", content: "Platform overview of all registered shops." }] }),
  component: Admin,
});

function Admin() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, shop_name, phone, district, plan, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const rows = data ?? [];
  const today = ymd(new Date());
  const pro = rows.filter((r) => r.plan === "pro");
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{t("admin")}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label={t("totalUsers")} value={String(rows.length)} />
        <Card label={t("newUsersToday")} value={String(rows.filter((r) => r.created_at.slice(0, 10) === today).length)} />
        <Card label={t("activeSubs")} value={String(pro.length)} />
        <Card label={t("revenue")} value={inr(pro.length * 99)} />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-3">{t("name")}</th><th className="p-3">{t("shopName")}</th><th className="p-3">{t("mobile")}</th><th className="p-3">{t("district")}</th><th className="p-3">{t("regDate")}</th><th className="p-3">{t("plan")}</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}><td className="p-3 font-medium">{r.full_name || "—"}</td><td className="p-3">{r.shop_name || "—"}</td>
                <td className="p-3">{r.phone || "—"}</td><td className="p-3">{r.district || "—"}</td><td className="p-3">{r.created_at.slice(0, 10)}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.plan === "pro" ? "bg-success/15 text-success" : "bg-muted"}`}>{r.plan === "pro" ? "Pro" : "Free"}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-card p-5"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 font-display text-2xl font-bold">{value}</div></div>;
}
