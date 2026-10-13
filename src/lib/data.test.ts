import { describe, it, expect } from "vitest";
import { totals, isLow, type Txn } from "./data";

const tx = (kind: "sale" | "expense", amount: number) => ({ id: "x", kind, amount, description: null, category: null, customer_id: null, txn_date: "2026-01-01" }) as Txn;

describe("business rules", () => {
  it("balance is sales minus expenses", () => {
    expect(totals([tx("sale", 500), tx("sale", 250), tx("expense", 300)])).toEqual({ sales: 750, expenses: 300, balance: 450 });
  });
  it("product is low stock at or below its threshold", () => {
    expect(isLow({ quantity: 5, low_stock_threshold: 5 })).toBe(true);
    expect(isLow({ quantity: 6, low_stock_threshold: 5 })).toBe(false);
  });
});
