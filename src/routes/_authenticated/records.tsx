import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Printer, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, inr } from "@/lib/i18n";
import { txnsQuery, totals, profileQuery, dateRange, waLink, customersQuery, type Txn, type DateFilter } from "@/lib/data";
import { TxnDialog } from "@/components/TxnDialog";
import { DateFilterBar } from "@/components/DateFilterBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({ meta: [{ title: "Sales & Expenses — PK SmartBook" }, { name: "description", content: "View and edit your sales and expenses." }, { property: "og:title", content: "Sales & Expenses — PK SmartBook" }, { property: "og:description", content: "View and edit your sales and expenses." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Records,
});

function Records() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { role } = useRouteContext({ from: "/_authenticated" });
  const [q, setQ] = useState("");
  const all = useQuery(txnsQuery).data ?? [];
  const profile = useQuery(profileQuery).data;
  const customers = useQuery(customersQuery).data ?? [];
  const [filter, setFilter] = useState<"all" | "sale" | "expense" | "pending">("all");
  const [df, setDf] = useState<DateFilter>({ kind: "today" });
  const [from, to] = dateRange(df);
  const inRange = all.filter((x) => x.txn_date >= from && x.txn_date <= to);
  const byKind = filter === "pending" ? inRange.filter((x) => x.on_credit)
    : filter === "all" ? inRange : inRange.filter((x) => x.kind === filter);
  const list = q ? byKind.filter((x) => `${x.description ?? ""} ${x.category ?? ""} ${x.amount}`.toLowerCase().includes(q.toLowerCase())) : byKind;
  const { sales, expenses, balance } = totals(inRange);

  function shareWa(x: Txn) {
    const shop = profile?.shop_name || t("appName");
    const item = `${x.description || t("sales")}${x.quantity ? ` × ${x.quantity} ${x.unit ?? ""}` : ""}`;
    const phone = customers.find((c) => c.id === x.customer_id)?.phone;
    window.open(waLink(t("waBill")(shop, x.id.slice(0, 8).toUpperCase(), item, inr(Number(x.amount)), x.txn_date), phone), "_blank");
  }

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

  function exportPdf() {
    const shop = profile?.shop_name || t("appName");
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) { toast.error("Popup blocked"); return; }
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
    const pend = inRange.filter((x) => x.on_credit);
    const row = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    const txnRows = inRange.map((x) => row([x.txn_date, esc(x.description || (x.kind === "sale" ? t("sales") : t("expenses"))), esc(x.category || "—"), x.kind === "sale" ? "+" : "−", inr(Number(x.amount)), x.on_credit ? t("pendingStatus") : t("completed")])).join("");
    const pendRows = pend.map((x) => row([x.txn_date, esc(customers.find((c) => c.id === x.customer_id)?.name || x.description || "—"), esc(x.category || "—"), x.due_date ?? "—", inr(Number(x.amount))])).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(shop)} — ${t("reportTitle")}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:680px;margin:24px auto;color:#1c1917}
      h1{font-size:22px;margin:0} .sub{color:#78716c;font-size:13px;margin:4px 0 18px}
      h2{font-size:15px;margin:22px 0 8px} table{width:100%;border-collapse:collapse;font-size:13px}
      td,th{border-bottom:1px solid #e7e5e4;padding:6px 8px;text-align:left}
      .sum{display:flex;gap:24px;font-weight:700;margin-top:8px}</style></head><body>
      <h1>${esc(shop)}</h1><div class="sub">${t("reportTitle")}: ${from} → ${to}</div>
      <div class="sum"><span>${t("sales")}: ${inr(sales)}</span><span>${t("expenses")}: ${inr(expenses)}</span><span>${t("balance")}: ${inr(balance)}</span></div>
      <h2>${t("records")}</h2>
      <table><tr><th>${t("date")}</th><th>${t("description")}</th><th>${t("category")}</th><th></th><th>${t("amount")}</th><th></th></tr>${txnRows || row([t("empty"), "", "", "", "", ""])}</table>
      <h2>${t("pendingList")}</h2>
      <table><tr><th>${t("date")}</th><th>${t("name")}</th><th>${t("category")}</th><th>${t("dueDate")}</th><th>${t("amount")}</th></tr>${pendRows || row([t("empty"), "", "", "", ""])}</table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  async function complete(x: Txn) {
    const { error } = await supabase.from("transactions").update({ on_credit: false }).eq("id", x.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["txns"] }); qc.invalidateQueries({ queryKey: ["customers"] });
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf}>{t("exportPdf")}</Button>
        </div>
      </div>
      <DateFilterBar value={df} onChange={setDf} />
      <Input placeholder="🔍" value={q} onChange={(e) => setQ(e.target.value)} className="h-12" />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border bg-card p-3"><div className="text-xs text-muted-foreground">{t("sales")}</div><div className="font-display text-lg font-bold text-success">{inr(sales)}</div></div>
        <div className="rounded-2xl border bg-card p-3"><div className="text-xs text-muted-foreground">{t("expenses")}</div><div className="font-display text-lg font-bold text-destructive">{inr(expenses)}</div></div>
        <div className="rounded-2xl bg-hero p-3 text-primary-foreground"><div className="text-xs opacity-90">{t("cashFlow")}</div><div className="font-display text-lg font-bold">{inr(balance)}</div></div>
      </div>
      <div role="tablist" aria-label={t("records")} className="flex flex-wrap gap-2">
        {([["all", t("all")], ["sale", `${t("sales")} · ${inr(sales)}`], ["expense", `${t("expenses")} · ${inr(expenses)}`], ["pending", t("pendingDue")]] as const).map(([k, l]) => (
          <Button role="tab" aria-selected={filter === k} variant={filter === k ? "default" : "outline"} key={k} onClick={() => setFilter(k)}
            className="h-auto min-h-9 whitespace-normal">{l}</Button>
        ))}
      </div>
      <div className="max-h-[60vh] divide-y overflow-y-auto rounded-2xl border bg-card">
        {list.length === 0 && <p className="p-6 text-center text-muted-foreground">{t("empty")}</p>}
        {list.map((x) => (
          <div key={x.id} className="flex items-center gap-3 p-4">
            <div className={`h-10 w-1.5 rounded-full ${x.kind === "sale" ? "bg-success" : "bg-destructive"}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{x.description || (x.kind === "sale" ? t("sales") : t("expenses"))}</div>
              <div className="text-xs text-muted-foreground">{x.txn_date}{x.quantity ? ` · ${x.quantity} ${x.unit ?? ""}` : ""}{x.category ? ` · ${x.category}` : ""}
                {x.customer_id && customers.find((c) => c.id === x.customer_id) ? ` · ${customers.find((c) => c.id === x.customer_id)!.name}` : ""}
                {x.on_credit && x.due_date ? ` · ${t("dueDate").split(" (")[0]}: ${x.due_date}` : ""}</div>
              {x.on_credit && <span className="mt-1 inline-block rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">{t("pendingStatus")}</span>}
            </div>
            <div className={`font-semibold ${x.kind === "sale" ? "text-success" : "text-destructive"}`}>
              {x.kind === "sale" ? "+" : "−"}{inr(Number(x.amount))}
            </div>
            {x.kind === "sale" && (
              <button aria-label={t("shareWa")} title={t("shareWa")} onClick={() => shareWa(x)} className="p-2 text-success"><MessageCircle className="h-4 w-4" /></button>
            )}
            {x.kind === "sale" && (
              <button aria-label={t("printReceipt")} title={t("printReceipt")} onClick={() => printReceipt(x)} className="p-2 text-muted-foreground"><Printer className="h-4 w-4" /></button>
            )}
            {x.on_credit && (
              <button aria-label={t("markCompleted")} title={t("markCompleted")} onClick={() => complete(x)} className="p-2 text-success"><CheckCircle2 className="h-4 w-4" /></button>
            )}
            <TxnDialog kind={x.kind} existing={x} trigger={<button aria-label={t("edit")} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>} />
            {role === "owner" && <button aria-label={t("delete")} onClick={() => remove(x.id)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}
