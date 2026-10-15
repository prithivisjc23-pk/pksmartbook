import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { shopId } from "@/lib/data";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    const [{ data: isAdmin }, shop] = await Promise.all([
      supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }),
      shopId(),
    ]);
    const role: "owner" | "cashier" = shop === data.user.id ? "owner" : "cashier";
    return { user: data.user, isAdmin: !!isAdmin, shopId: shop, role };
  },
  component: AppShell,
});
