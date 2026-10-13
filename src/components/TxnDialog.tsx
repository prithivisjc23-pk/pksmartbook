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
import { customersQuery, type Txn } from "@/lib/data";

export function TxnDialog({ kind, existing, trigger }: { kind: "sale" | "expense"; existing?: Txn; trigger?: ReactNode }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const customers = useQuery(customersQuery).data ?? [];
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    amount: existing ? String(existing.amount) : "",
    description: existing?.description ?? "",
    category: existing?.category ?? "",
    customer_id: existing?.customer_id ?? "",
    txn_date: existing?.txn_date ?? new Date().toISOString().slice(0, 10),
  });

  const m = useMutation({
    mutationFn: async () => {
      const row = { kind, amount: Number(f.amount), description: f.description || null, category: f.category || null,
        customer_id: f.customer_id || null, txn_date: f.txn_date };
      const { error } = existing
        ? await supabase.from("transactions").update(row).eq("id", existing.id)
        : await supabase.from("transactions").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["txns"] }); toast.success(t("saved")); setOpen(false); },
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
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">{title}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
          <div className="space-y-1"><Label>{t("amount")}</Label>
            <Input type="number" inputMode="decimal" min="0" step="0.01" required autoFocus value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="h-12 text-lg" /></div>
          <div className="space-y-1"><Label>{t("description")}</Label>
            <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t("category")}</Label>
              <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("date")}</Label>
              <Input type="date" value={f.txn_date} onChange={(e) => setF({ ...f, txn_date: e.target.value })} /></div>
          </div>
          {kind === "sale" && (
            <div className="space-y-1"><Label>{t("customer")}</Label>
              <select value={f.customer_id} onChange={(e) => setF({ ...f, customer_id: e.target.value })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm">
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
