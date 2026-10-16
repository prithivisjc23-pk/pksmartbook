import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";
import { profileQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PK SmartBook" }, { name: "description", content: "Shop details, Shop ID and language." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const { role, shopId } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const profile = useQuery(profileQuery).data;
  const [f, setF] = useState({ full_name: "", shop_name: "" });
  useEffect(() => { if (profile) setF({ full_name: profile.full_name ?? "", shop_name: profile.shop_name ?? "" }); }, [profile]);
  const owner = role === "owner";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update(f).eq("id", shopId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{t("settings")}</h1>
      {owner && (
        <form onSubmit={save} className="space-y-3 rounded-2xl border bg-card p-5">
          <div className="space-y-1"><Label>{t("fullName")}</Label><Input className="h-12" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>{t("shopName")}</Label><Input className="h-12" value={f.shop_name} onChange={(e) => setF({ ...f, shop_name: e.target.value })} /></div>
          <Button type="submit" className="h-12 w-full rounded-full">{t("save")}</Button>
        </form>
      )}
      <div className="space-y-2 rounded-2xl border bg-card p-5">
        <div className="font-display text-lg font-bold">{t("shopIdLabel")}</div>
        {owner && <p className="text-sm text-muted-foreground">{t("shopIdHint")}</p>}
        <div className="flex gap-2">
          <code className="flex-1 break-all rounded-lg bg-muted p-3 text-sm">{shopId}</code>
          <Button variant="outline" className="h-auto rounded-full" onClick={() => { navigator.clipboard.writeText(shopId); toast.success(t("copied")); }}>{t("copy")}</Button>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
        <span className="font-semibold">Language / மொழி</span><LangToggle />
      </div>
    </div>
  );
}
