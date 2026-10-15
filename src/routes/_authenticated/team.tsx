import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team — PK SmartBook" }, { name: "description", content: "Add cashiers to your shop." }] }),
  component: Team,
});

/** phone → last 10 digits; email → lowercase */
export const normContact = (s: string) => (s.includes("@") ? s.trim().toLowerCase() : s.replace(/\D/g, "").slice(-10));

function Team() {
  const { t } = useI18n();
  const { role, user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const [c, setC] = useState("");
  const list = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_members").select("*").eq("owner_id", user.id).order("created_at");
      if (error) throw error;
      return data;
    },
  }).data ?? [];

  if (role !== "owner") return <p className="text-muted-foreground">{t("adminOnly")}</p>;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const contact = normContact(c);
    if (contact.length < 5) return;
    const { error } = await supabase.from("shop_members").insert({ contact });
    if (error) { toast.error(error.message); return; }
    setC(""); toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["team"] });
  }
  async function remove(id: string) {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("shop_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{t("team")}</h1>
      <form onSubmit={add} className="space-y-3 rounded-2xl border bg-card p-5">
        <div className="font-display text-lg font-bold">{t("inviteCashier")}</div>
        <p className="text-sm text-muted-foreground">{t("inviteHint")}</p>
        <div className="flex gap-2">
          <Input value={c} onChange={(e) => setC(e.target.value)} placeholder={t("contact")} className="h-12" required />
          <Button type="submit" className="h-12 rounded-full px-6">{t("add")}</Button>
        </div>
      </form>
      <div className="divide-y rounded-2xl border bg-card">
        {list.length === 0 && <p className="p-5 text-muted-foreground">{t("empty")}</p>}
        {list.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            {m.member_id ? <UserCheck className="h-5 w-5 text-success" /> : <Clock className="h-5 w-5 text-warning" />}
            <div className="flex-1 font-medium">{m.contact}</div>
            <button aria-label={t("delete")} onClick={() => remove(m.id)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
