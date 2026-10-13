import { supabase } from "@/integrations/supabase/client";

export type Txn = {
  id: string; kind: "sale" | "expense"; amount: number; description: string | null;
  category: string | null; customer_id: string | null; txn_date: string;
};
export type Customer = { id: string; name: string; phone: string | null; pending_amount: number; notes: string | null };
export type Product = { id: string; name: string; quantity: number; low_stock_threshold: number; price: number };

async function myId() {
  const { data } = await supabase.auth.getUser();
  return data.user!.id;
}

export const txnsQuery = {
  queryKey: ["txns"],
  queryFn: async () => {
    const uid = await myId();
    const { data, error } = await supabase.from("transactions").select("*").eq("user_id", uid).order("txn_date", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as Txn[];
  },
};
export const customersQuery = {
  queryKey: ["customers"],
  queryFn: async () => {
    const uid = await myId();
    const { data, error } = await supabase.from("customers").select("*").eq("user_id", uid).order("name");
    if (error) throw error;
    return data as unknown as Customer[];
  },
};
export const productsQuery = {
  queryKey: ["products"],
  queryFn: async () => {
    const uid = await myId();
    const { data, error } = await supabase.from("products").select("*").eq("user_id", uid).order("name");
    if (error) throw error;
    return data as unknown as Product[];
  },
};

export function totals(txns: Txn[]) {
  const sales = txns.filter((x) => x.kind === "sale").reduce((s, x) => s + Number(x.amount), 0);
  const expenses = txns.filter((x) => x.kind === "expense").reduce((s, x) => s + Number(x.amount), 0);
  return { sales, expenses, balance: sales - expenses };
}

export const isLow = (p: Pick<Product, "quantity" | "low_stock_threshold">) => p.quantity <= p.low_stock_threshold;
