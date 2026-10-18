import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle, Clock, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n, inr } from "@/lib/i18n";
import { txnsQuery, customersQuery, productsQuery, totals, stockLevel, dateRange, pendingTotal, shopId, profileQuery, entryFormMode, ymd, type DateFilter } from "@/lib/data";
import { TxnDialog } from "@/components/TxnDialog";
import { DateFilterBar } from "@/components/DateFilterBar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PK SmartBook" }, { name: "description", content: "Today's sales, expenses, balance and customer pending at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { role } = useRouteContext({ from: "/_authenticated" });
  const all = useQuery(txnsQuery).data ?? [];
  const customers = useQuery(customersQuery).data ?? [];
  const products = useQuery(productsQuery).data ?? [];
  const profile = useQuery(profileQuery);
  const personal = entryFormMode(profile.data?.account_type) === "simple";
  const [df, setDf] = useState<DateFilter>({ kind: "today" });
  const [from, to] = dateRange(df);
  const txns = all.filter((x) => x.txn_date >= from && x.txn_date <= to);
  const { sales, expenses, balance } = totals(txns);
  const kadan = pendingTotal(customers);
  const pending = customers.filter((c) => Number(c.pending_amount) > 0);
  const low = products.filter((p) => stockLevel(p.quantity) !== "ok");

  const cats = new Map<string, number>();
  txns.forEach((x) => cats.set(x.category || "—", (cats.get(x.category || "—") ?? 0) + (x.kind === "sale" ? 1 : -1) * Number(x.amount)));

  return (
    <div className="space-y-5">
      <DateFilterBar value={df} onChange={setDf} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("todaySales")} value={sales} icon={ArrowUpCircle} cls="border-success/40 bg-success/10 text-success" />
        <Stat label={t("todayExpenses")} value={expenses} icon={ArrowDownCircle} cls="border-destructive/40 bg-destructive/10 text-destructive" />
        <Stat label={t("netBalance")} value={balance} icon={Wallet} cls="border-primary/40 bg-primary/10 text-primary" />
        {!personal && <Stat label={t("kadan")} value={kadan} icon={HandCoins} cls="border-warning/50 bg-warning/15 text-warning" />}
      </div>

      {profile.isSuccess && (personal ? <QuickEntry /> : (
        <div className="grid grid-cols-2 gap-3">
          <TxnDialog kind="sale" trigger={<Button className="h-36 whitespace-normal rounded-2xl bg-success px-3 font-display text-2xl font-bold text-success-foreground hover:bg-success/90">{t("primarySales")}</Button>} />
          <TxnDialog kind="expense" trigger={<Button variant="destructive" className="h-36 whitespace-normal rounded-2xl px-3 font-display text-2xl font-bold">{t("selavu")}</Button>} />
        </div>
      ))}
      {!personal && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title={t("pending")} icon={Clock} link="/customers">
              {pending.length === 0 ? <Empty text={t("allGood")} /> : pending.slice(0, 5).map((c) => (
                <Row key={c.id} left={c.name} right={inr(Number(c.pending_amount))} tone="text-warning" />
              ))}
            </Panel>
            {role === "owner" && (
              <Panel title={t("lowStock")} icon={AlertTriangle} link="/inventory">
                {low.length === 0 ? <Empty text={t("allGood")} /> : low.slice(0, 5).map((p) => (
                  <Row key={p.id} left={p.name} right={`${p.quantity} ${p.unit ?? "Pcs"}`} tone={p.quantity <= 0 ? "text-destructive" : "text-warning"} />
                ))}
              </Panel>
            )}
          </div>
          {role === "owner" && (
            <Panel title={t("profitLoss")} link="/records">
              {cats.size === 0 ? <Empty text={t("empty")} /> : [...cats].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                <Row key={c} left={c} right={`${v >= 0 ? "+" : "−"}${inr(Math.abs(v))}`} tone={v >= 0 ? "text-success" : "text-destructive"} />
              ))}
            </Panel>
          )}
        </>
      )}

      <Panel title={t("recent")} link="/records">
        {txns.length === 0 ? <Empty text={t("empty")} /> : txns.slice(0, 6).map((x) => (
          <Row key={x.id} left={`${x.description || (x.kind === "sale" ? t("sales") : t("expenses"))} · ${x.txn_date}`}
            right={`${x.kind === "sale" ? "+" : "−"}${inr(Number(x.amount))}`} tone={x.kind === "sale" ? "text-success" : "text-destructive"} />
        ))}
      </Panel>
      <p className="pt-4 text-center text-xs text-muted-foreground">{t("poweredBy")}</p>
    </div>
  );
}

function QuickEntry() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [kind, setKind] = useState<"sale" | "expense" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(ymd(new Date()));
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!kind || !Number(amount) || (kind === "expense" && !reason.trim())) return;
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({ user_id: await shopId(), kind, amount: Number(amount), description: reason.trim() || null, on_credit: pending, txn_date: date });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved")); setAmount(""); setReason(""); setDate(ymd(new Date())); setPending(false); setKind(null);
    qc.invalidateQueries({ queryKey: ["txns"] });
  }

  if (!kind) return (
    <div className="grid grid-cols-2 gap-3">
      <Button onClick={() => setKind("sale")} className="h-36 whitespace-normal rounded-2xl bg-success px-3 font-display text-2xl font-bold text-success-foreground hover:bg-success/90">{t("varavu")}</Button>
      <Button variant="destructive" onClick={() => setKind("expense")} className="h-36 whitespace-normal rounded-2xl px-3 font-display text-2xl font-bold">{t("selavu")}</Button>
    </div>
  );
  return (
    <form onSubmit={save} className={`space-y-3 rounded-3xl border-2 p-5 ${kind === "sale" ? "border-success" : "border-destructive"}`}>
      <div className={`font-display text-2xl font-bold ${kind === "sale" ? "text-success" : "text-destructive"}`}>{kind === "sale" ? t("varavu") : t("selavu")}</div>
      <Input autoFocus type="number" inputMode="decimal" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
        aria-label={t("amount")} placeholder="₹" className="h-16 text-center text-3xl font-bold" />
      <Input required={kind === "expense"} value={reason} onChange={(e) => setReason(e.target.value)}
        aria-label={t("description")} placeholder={t("description")} className="h-12 text-base" />
      <Input aria-label={t("date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />
      <div className="grid grid-cols-2 gap-2">
        {([[false, t("completed")], [true, t("pendingStatus")]] as const).map(([v, l]) => (
          <Button variant="outline" type="button" key={l} onClick={() => setPending(v)} aria-pressed={pending === v}
            className={`h-12 whitespace-normal rounded-lg border-2 font-semibold ${pending === v ? (v ? "border-warning bg-warning/15" : "border-success bg-success/10") : ""}`}>{l}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" className="h-14 rounded-2xl text-lg" onClick={() => setKind(null)}>{t("cancel")}</Button>
        <Button type="submit" disabled={busy} className="h-14 rounded-2xl text-lg">{t("save")}</Button>
      </div>
    </form>
  );
}

function Stat({ label, value, icon: Icon, cls }: { label: string; value: number; icon: typeof Wallet; cls: string }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${cls}`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-foreground md:text-3xl">{inr(value)}</div>
    </div>
  );
}
function Panel({ title, icon: Icon, link, children }: { title: string; icon?: typeof Wallet; link: "/customers" | "/inventory" | "/records"; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <Link to={link} className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        {Icon && <Icon className="h-5 w-5 text-accent" />} {title}
      </Link>
      <div className="divide-y">{children}</div>
    </div>
  );
}
function Row({ left, right, tone }: { left: string; right: string; tone: string }) {
  return <div className="flex justify-between gap-2 py-2 text-sm"><span className="truncate">{left}</span><span className={`font-semibold ${tone}`}>{right}</span></div>;
}
function Empty({ text }: { text: string }) {
  return <p className="py-2 text-sm text-muted-foreground">{text}</p>;
}
