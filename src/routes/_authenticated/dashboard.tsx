import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle, Clock } from "lucide-react";
import { useI18n, inr } from "@/lib/i18n";
import { txnsQuery, customersQuery, productsQuery, totals, isLow } from "@/lib/data";
import { TxnDialog } from "@/components/TxnDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PK SmartBook AI" }, { name: "description", content: "Your shop at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const txns = useQuery(txnsQuery).data ?? [];
  const customers = useQuery(customersQuery).data ?? [];
  const products = useQuery(productsQuery).data ?? [];
  const { sales, expenses, balance } = totals(txns);
  const pending = customers.filter((c) => Number(c.pending_amount) > 0);
  const low = products.filter(isLow);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <TxnDialog kind="sale" />
        <TxnDialog kind="expense" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("totalSales")} value={sales} icon={ArrowUpCircle} tone="text-success" />
        <Stat label={t("totalExpenses")} value={expenses} icon={ArrowDownCircle} tone="text-destructive" />
        <div className="rounded-2xl bg-hero p-5 text-primary-foreground shadow-soft">
          <div className="flex items-center gap-2 text-sm opacity-90"><Wallet className="h-4 w-4" /> {t("balance")}</div>
          <div className="mt-2 font-display text-3xl font-bold">{inr(balance)}</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={t("pending")} icon={Clock} link="/customers">
          {pending.length === 0 ? <Empty text={t("allGood")} /> : pending.slice(0, 5).map((c) => (
            <Row key={c.id} left={c.name} right={inr(Number(c.pending_amount))} tone="text-warning" />
          ))}
        </Panel>
        <Panel title={t("lowStock")} icon={AlertTriangle} link="/inventory">
          {low.length === 0 ? <Empty text={t("allGood")} /> : low.slice(0, 5).map((p) => (
            <Row key={p.id} left={p.name} right={`${p.quantity}`} tone="text-destructive" />
          ))}
        </Panel>
      </div>
      <Panel title={t("recent")} link="/records">
        {txns.length === 0 ? <Empty text={t("empty")} /> : txns.slice(0, 6).map((x) => (
          <Row key={x.id} left={`${x.description || (x.kind === "sale" ? t("sales") : t("expenses"))} · ${x.txn_date}`}
            right={`${x.kind === "sale" ? "+" : "−"}${inr(Number(x.amount))}`} tone={x.kind === "sale" ? "text-success" : "text-destructive"} />
        ))}
      </Panel>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Wallet; tone: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className={`h-4 w-4 ${tone}`} /> {label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{inr(value)}</div>
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
