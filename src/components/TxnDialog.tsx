import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { customersQuery, productsQuery, UNITS, SALE_CATEGORIES, EXPENSE_CATEGORIES, ymd, type Txn } from "@/lib/data";

const sel = "h-10 w-full rounded-md border bg-background px-3 text-sm";

export function TxnDialog({ kind, existing, trigger }: { kind: "sale" | "expense"; existing?: Txn; trigger?: ReactNode }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const customers = useQuery(customersQuery).data ?? [];
  const products = useQuery(productsQuery).data ?? [];
  const cats = kind === "sale" ? SALE_CATEGORIES : EXPENSE_CATEGORIES;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    amount: existing ? String(existing.amount) : "",
    description: existing?.description ?? "",
    category: existing?.category ?? "",
    customer_id: existing?.customer_id ?? "",
    txn_date: existing?.txn_date ?? ymd(new Date()),
    product_id: existing?.product_id ?? "",
    quantity: existing?.quantity ? String(existing.quantity) : "",
    unit: existing?.unit ?? "Pcs",
  });

  function pickProduct(id: string) {
    const p = products.find((x) => x.id === id);
    const qty = Number(f.quantity) || 1;
    setF({ ...f, product_id: id, unit: p?.unit ?? f.unit, category: p?.category ?? f.category,
      description: f.description || p?.name || "", quantity: p ? String(qty) : f.quantity,
      amount: p && !f.amount ? String(Number(p.price) * qty) : f.amount });
  }

  const m = useMutation({
    mutationFn: async () => {
      const row = { kind, amount: Number(f.amount), description: f.description || null, category: f.category || null,
        customer_id: f.customer_id || null, txn_date: f.txn_date,
        product_id: kind === "sale" && f.product_id ? f.product_id : null,
        quantity: parseInt(f.quantity) || 0, unit: f.quantity ? f.unit : null };
      const { error } = existing
        ? await supabase.from("transactions").update(row).eq("id", existing.id)
        : await supabase.from("transactions").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["txns"] }); qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("saved")); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const title = existing ? t("edit") : kind === "sale" ? t("addSale") : t("addExpense");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={kind === "sale" ? "default" : "secondary"} className="h-11 rounded-full px-5">
            <Plus className="h-4 w-4" /> {title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{title}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
          {kind === "sale" && products.length > 0 && (
            <div className="space-y-1"><Label>{t("stockItem")}</Label>
              <select value={f.product_id} onChange={(e) => pickProduct(e.target.value)} className={sel}>
                <option value="">{t("none")}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.quantity} {p.unit ?? "Pcs"})</option>)}
              </select></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t("quantity")}</Label>
              <Input type="number" min="0" step="1" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("unit")}</Label>
              <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={sel}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select></div>
          </div>
          <div className="space-y-1"><Label>{t("amount")}</Label>
            <Input type="number" inputMode="decimal" min="0" step="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="h-12 text-lg" /></div>
          <div className="space-y-1"><Label>{t("description")}</Label>
            <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t("category")}</Label>
              <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={sel}>
                <option value="">{t("none")}</option>
                {[...new Set([...cats, ...(f.category ? [f.category] : [])])].map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div className="space-y-1"><Label>{t("date")}</Label>
              <Input type="date" value={f.txn_date} onChange={(e) => setF({ ...f, txn_date: e.target.value })} /></div>
          </div>
          {kind === "sale" && (
            <div className="space-y-1"><Label>{t("customer")}</Label>
              <select value={f.customer_id} onChange={(e) => setF({ ...f, customer_id: e.target.value })} className={sel}>
                <option value="">{t("none")}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          )}
          <Button type="submit" disabled={m.isPending} className="h-11 w-full rounded-full">{t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
