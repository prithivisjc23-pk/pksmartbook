import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, inr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — PK SmartBook" }, { name: "description", content: "Admin overview of all shops." }] }),
  component: Admin,
});

function Admin() {
  const { t } = useI18n();
  const { isAdmin } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const [p, tx] = await Promise.all([
        supabase.from("profiles").select("id, full_name, shop_name, created_at"),
        supabase.from("transactions").select("user_id, kind, amount"),
      ]);
      if (p.error) throw p.error;
      if (tx.error) throw tx.error;
      return (p.data ?? []).map((pr) => {
        const mine = (tx.data ?? []).filter((x) => x.user_id === pr.id);
        const sales = mine.filter((x) => x.kind === "sale").reduce((s, x) => s + Number(x.amount), 0);
        const exp = mine.filter((x) => x.kind === "expense").reduce((s, x) => s + Number(x.amount), 0);
        return { ...pr, sales, exp, count: mine.length };
      });
    },
  });

  if (!isAdmin) return <p className="text-muted-foreground">{t("adminOnly")}</p>;
  const rows = data ?? [];
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{t("admin")}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card label={t("users")} value={String(rows.length)} />
        <Card label={t("totalSales")} value={inr(rows.reduce((s, r) => s + r.sales, 0))} />
        <Card label={t("totalExpenses")} value={inr(rows.reduce((s, r) => s + r.exp, 0))} />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-3">{t("shopName")}</th><th className="p-3">{t("name")}</th><th className="p-3">{t("sales")}</th><th className="p-3">{t("expenses")}</th><th className="p-3">{t("records")}</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}><td className="p-3 font-medium">{r.shop_name || "—"}</td><td className="p-3">{r.full_name || "—"}</td>
                <td className="p-3 text-success">{inr(r.sales)}</td><td className="p-3 text-destructive">{inr(r.exp)}</td><td className="p-3">{r.count}</td></tr>
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
