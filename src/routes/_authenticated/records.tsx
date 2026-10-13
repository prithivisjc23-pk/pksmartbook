import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, inr } from "@/lib/i18n";
import { txnsQuery, totals, profileQuery, type Txn } from "@/lib/data";
import { TxnDialog } from "@/components/TxnDialog";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({ meta: [{ title: "Sales & Expenses — SolluBook AI" }, { name: "description", content: "View and edit your sales and expenses." }] }),
  component: Records,
});

function Records() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const all = useQuery(txnsQuery).data ?? [];
  const profile = useQuery(profileQuery).data;
  const [filter, setFilter] = useState<"all" | "sale" | "expense">("all");
  const list = filter === "all" ? all : all.filter((x) => x.kind === filter);
  const { sales, expenses } = totals(all);

  function printReceipt(x: Txn) {
    const shop = profile?.shop_name || t("appName");
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) { toast.error("Popup blocked"); return; }
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(shop)} — ${t("printReceipt")}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:320px;margin:24px auto;color:#1c1917}
      h1{font-size:20px;text-align:center;margin:0} .sub{text-align:center;color:#78716c;font-size:12px;margin:4px 0 16px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #d6d3d1;font-size:14px}
      .total{font-size:18px;font-weight:700;border-bottom:none;margin-top:6px}
      .thanks{text-align:center;margin-top:20px;font-size:13px;color:#78716c}</style></head><body>
      <h1>${esc(shop)}</h1><div class="sub">${t("receiptNo")}: ${x.id.slice(0, 8).toUpperCase()}</div>
      <div class="row"><span>${t("date")}</span><span>${x.txn_date}</span></div>
      <div class="row"><span>${t("description")}</span><span>${esc(x.description || t("sales"))}</span></div>
      ${x.category ? `<div class="row"><span>${t("category")}</span><span>${esc(x.category)}</span></div>` : ""}
      <div class="row total"><span>${t("amount")}</span><span>${inr(Number(x.amount))}</span></div>
      <div class="thanks">${t("receiptThanks")}</div>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  async function remove(id: string) {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
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
            {x.kind === "sale" && (
              <button aria-label={t("printReceipt")} title={t("printReceipt")} onClick={() => printReceipt(x)} className="p-2 text-muted-foreground"><Printer className="h-4 w-4" /></button>
            )}
            <TxnDialog kind={x.kind} existing={x} trigger={<button aria-label={t("edit")} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>} />
            <button aria-label={t("delete")} onClick={() => remove(x.id)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
