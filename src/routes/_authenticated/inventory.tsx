import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Minus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n, inr } from "@/lib/i18n";
import { productsQuery, stockLevel, UNITS, SALE_CATEGORIES, type Product } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Stock — PK SmartBook" }, { name: "description", content: "Inventory and low-stock alerts." }, { property: "og:title", content: "Stock — PK SmartBook" }, { property: "og:description", content: "Inventory and low-stock alerts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Inventory,
});

const blank = { name: "", quantity: "0", low_stock_threshold: "5", price: "0", unit: "Pcs", category: "" };
const sel = "h-10 w-full rounded-md border bg-background px-3 text-sm";

function Inventory() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const list = useQuery(productsQuery).data ?? [];
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const low = list.filter((p) => stockLevel(p.quantity) !== "ok");
  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });

  function startEdit(p?: Product) {
    setEditing(p ?? null);
    setF(p ? { name: p.name, quantity: String(p.quantity), low_stock_threshold: String(p.low_stock_threshold), price: String(p.price), unit: p.unit ?? "Pcs", category: p.category ?? "" } : blank);
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = { name: f.name, quantity: parseInt(f.quantity) || 0, low_stock_threshold: parseInt(f.low_stock_threshold) || 0, price: Number(f.price) || 0, unit: f.unit, category: f.category || null };
    const { error } = editing ? await supabase.from("products").update(row).eq("id", editing.id) : await supabase.from("products").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved")); setOpen(false); refresh();
  }
  async function bump(p: Product, d: number) {
    const { error } = await supabase.from("products").update({ quantity: Math.max(0, p.quantity + d) }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function remove(p: Product) {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted")); refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("inventory")}</h1>
        <Button onClick={() => startEdit()} className="h-11 rounded-full px-5"><Plus className="h-4 w-4" /> {t("addProduct")}</Button>
      </div>
      {low.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div><span className="font-semibold">{t("lowStock")}:</span> {low.map((p) => p.name).join(", ")}</div>
        </div>
      )}
      <div className="divide-y rounded-2xl border bg-card">
        {list.length === 0 && <p className="p-6 text-center text-muted-foreground">{t("empty")}</p>}
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 truncate font-medium">
                {p.name}
                {stockLevel(p.quantity) === "out" && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">{t("outOfStock")}</span>}
                {stockLevel(p.quantity) === "low" && <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-foreground">{t("low")}</span>}
              </div>
              <div className="text-xs text-muted-foreground">{inr(Number(p.price))} / {p.unit ?? "Pcs"}{p.category ? ` · ${p.category}` : ""}</div>
            </div>
            <div className="flex items-center gap-1">
              <button aria-label="-1" onClick={() => bump(p, -1)} className="rounded-full border p-1.5"><Minus className="h-3 w-3" /></button>
              <span className={`w-14 text-center font-display text-lg font-bold ${stockLevel(p.quantity) === "out" ? "text-destructive" : stockLevel(p.quantity) === "low" ? "text-warning" : ""}`}>{p.quantity}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{p.unit ?? "Pcs"}</span></span>
              <button aria-label="+1" onClick={() => bump(p, 1)} className="rounded-full border p-1.5"><Plus className="h-3 w-3" /></button>
            </div>
            <button aria-label={t("edit")} onClick={() => startEdit(p)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
            <button aria-label={t("delete")} onClick={() => remove(p)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? t("edit") : t("addProduct")}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>{t("product")}</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t("quantity")}</Label><Input type="number" min="0" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("threshold")}</Label><Input type="number" min="0" value={f.low_stock_threshold} onChange={(e) => setF({ ...f, low_stock_threshold: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t("unit")}</Label><select className={sel} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></div>
              <div className="space-y-1"><Label>{t("category")}</Label><select className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">{t("none")}</option>{SALE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="space-y-1"><Label>{t("price")}</Label><Input type="number" min="0" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
            <Button type="submit" className="h-11 w-full rounded-full">{t("save")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
