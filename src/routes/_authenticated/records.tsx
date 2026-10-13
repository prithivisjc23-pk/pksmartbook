import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, inr } from "@/lib/i18n";
import { txnsQuery, totals } from "@/lib/data";
import { TxnDialog } from "@/components/TxnDialog";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({ meta: [{ title: "Sales & Expenses — SolluBook AI" }, { name: "description", content: "View and edit your sales and expenses." }] }),
  component: Records,
});

function Records() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const all = useQuery(txnsQuery).data ?? [];
  const [filter, setFilter] = useState<"all" | "sale" | "expense">("all");
  const list = filter === "all" ? all : all.filter((x) => x.kind === filter);
  const { sales, expenses } = totals(all);

  async function remove(id: string) {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["txns"] });
    toast.success(t("deleted"));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("records")}</h1>
        <div className="flex gap-2"><TxnDialog kind="sale" /><TxnDialog kind="expense" /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {([["all", t("all")], ["sale", `${t("sales")} · ${inr(sales)}`], ["expense", `${t("expenses")} · ${inr(expenses)}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${filter === k ? "bg-primary text-primary-foreground" : "bg-card"}`}>{l}</button>
        ))}
      </div>
      <div className="divide-y rounded-2xl border bg-card">
        {list.length === 0 && <p className="p-6 text-center text-muted-foreground">{t("empty")}</p>}
        {list.map((x) => (
          <div key={x.id} className="flex items-center gap-3 p-4">
            <div className={`h-10 w-1.5 rounded-full ${x.kind === "sale" ? "bg-success" : "bg-destructive"}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{x.description || (x.kind === "sale" ? t("sales") : t("expenses"))}</div>
              <div className="text-xs text-muted-foreground">{x.txn_date}{x.category ? ` · ${x.category}` : ""}</div>
            </div>
            <div className={`font-semibold ${x.kind === "sale" ? "text-success" : "text-destructive"}`}>
              {x.kind === "sale" ? "+" : "−"}{inr(Number(x.amount))}
            </div>
            <TxnDialog kind={x.kind} existing={x} trigger={<button aria-label={t("edit")} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>} />
            <button aria-label={t("delete")} onClick={() => remove(x.id)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
