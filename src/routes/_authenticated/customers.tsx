import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n, inr } from "@/lib/i18n";
import { customersQuery, profileQuery, type Customer } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — PK SmartBook AI" }, { name: "description", content: "Customers and pending payments." }] }),
  component: Customers,
});

const blank = { name: "", phone: "", pending_amount: "0", notes: "" };

function Customers() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const list = useQuery(customersQuery).data ?? [];
  const profile = useQuery(profileQuery).data;
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const totalPending = list.reduce((s, c) => s + Number(c.pending_amount), 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["customers"] });
  function startEdit(c?: Customer) {
    setEditing(c ?? null);
    setF(c ? { name: c.name, phone: c.phone ?? "", pending_amount: String(c.pending_amount), notes: c.notes ?? "" } : blank);
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = { name: f.name, phone: f.phone || null, pending_amount: Number(f.pending_amount) || 0, notes: f.notes || null };
    const { error } = editing ? await supabase.from("customers").update(row).eq("id", editing.id) : await supabase.from("customers").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved")); setOpen(false); refresh();
  }
  function waReminder(c: Customer) {
    const shop = profile?.shop_name || t("appName");
    const text = encodeURIComponent(t("waMsg")(c.name, inr(Number(c.pending_amount)), shop));
    const digits = (c.phone ?? "").replace(/\D/g, "");
    window.open(digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  }
  async function markPaid(c: Customer) {
    const { error } = await supabase.from("customers").update({ pending_amount: 0 }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function remove(c: Customer) {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted")); refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("customers")}</h1>
          <p className="text-sm text-muted-foreground">{t("pending")}: <span className="font-semibold text-warning">{inr(totalPending)}</span></p>
        </div>
        <Button onClick={() => startEdit()} className="h-11 rounded-full px-5"><Plus className="h-4 w-4" /> {t("addCustomer")}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
        {list.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-bold">{c.name}</div>
                {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</a>}
              </div>
              <div className="flex">
                <button aria-label={t("edit")} onClick={() => startEdit(c)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                <button aria-label={t("delete")} onClick={() => remove(c)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`font-semibold ${Number(c.pending_amount) > 0 ? "text-warning" : "text-success"}`}>{inr(Number(c.pending_amount))}</span>
              {Number(c.pending_amount) > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full text-success" onClick={() => waReminder(c)}>
                    <MessageCircle className="h-4 w-4" /> {t("waReminder")}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => markPaid(c)}>{t("markPaid")}</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? t("edit") : t("addCustomer")}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>{t("name")}</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("phone")}</Label><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("pendingAmount")}</Label><Input type="number" min="0" step="0.01" value={f.pending_amount} onChange={(e) => setF({ ...f, pending_amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("notes")}</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <Button type="submit" className="h-11 w-full rounded-full">{t("save")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
