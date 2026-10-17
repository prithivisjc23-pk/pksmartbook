import { supabase } from "@/integrations/supabase/client";

export type Txn = {
  id: string; kind: "sale" | "expense"; amount: number; description: string | null;
  category: string | null; customer_id: string | null; txn_date: string;
  product_id?: string | null; quantity?: number; unit?: string | null; on_credit?: boolean;
};
export type Customer = { id: string; name: string; phone: string | null; pending_amount: number; notes: string | null };
export type Product = { id: string; name: string; quantity: number; low_stock_threshold: number; price: number; unit?: string; category?: string | null };

let shopCache: { uid: string; shop: Promise<string> } | null = null;
/** The shop (owner id) this user works in: their own, or the shop that invited them as cashier. */
export async function shopId() {
  const { data } = await supabase.auth.getSession();
  const uid = data.session!.user.id;
  if (shopCache?.uid !== uid) {
    const shop = Promise.resolve(supabase.rpc("claim_shop")).then(({ data: s }) => (s as string | null) ?? uid);
    shopCache = { uid, shop };
    return shop;
  }
  return shopCache.shop;
}
const myId = shopId;

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
export type Profile = { id: string; full_name: string | null; shop_name: string | null; account_type: string };
export const profileQuery = {
  queryKey: ["profile"],
  queryFn: async () => {
    const uid = await myId();
    const { data, error } = await supabase.from("profiles").select("id, full_name, shop_name, account_type").eq("id", uid).maybeSingle();
    if (error) throw error;
    return data as Profile | null;
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

export const UNITS = ["Pcs", "Kg", "Grams", "Litre", "Packet"] as const;
export const SALE_CATEGORIES = ["Grocery", "Vegetables", "Dairy", "Snacks", "Beverages", "Stationery", "Other"];
export const EXPENSE_CATEGORIES = ["Stock purchase", "Rent", "Electricity", "Salary", "Transport", "Other"];

/** out = 0, low = below 5, ok otherwise */
export const stockLevel = (q: number): "out" | "low" | "ok" => (q <= 0 ? "out" : q < 5 ? "low" : "ok");

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export { ymd };
export type DateFilter = { kind: "today" | "yesterday" | "week" | "month" | "day"; day?: string };
/** inclusive [from, to] YYYY-MM-DD range; week = Monday..today; month = 1st..today */
export function dateRange(f: DateFilter, now = new Date()): [string, string] {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (f.kind === "yesterday") { d.setDate(d.getDate() - 1); return [ymd(d), ymd(d)]; }
  if (f.kind === "week") { const s = new Date(d); s.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [ymd(s), ymd(d)]; }
  if (f.kind === "month") { const s = new Date(d.getFullYear(), d.getMonth(), 1); return [ymd(s), ymd(d)]; }
  if (f.kind === "day" && f.day) return [f.day, f.day];
  return [ymd(d), ymd(d)];
}

/** universal wa.me link — OS shows chooser when WhatsApp + Business are installed */
export function waLink(text: string, phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const num = digits.length === 10 ? "91" + digits : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export const pendingTotal = (cs: Pick<Customer, "pending_amount">[]) => cs.reduce((s, c) => s + Number(c.pending_amount), 0);
