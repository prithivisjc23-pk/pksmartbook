import { describe, it, expect } from "vitest";
import { pendingTotal, totals, isLow, stockLevel, dateRange, waLink, type Txn } from "./data";

const tx = (kind: "sale" | "expense", amount: number) => ({ id: "x", kind, amount, description: null, category: null, customer_id: null, txn_date: "2026-01-01" }) as Txn;

describe("business rules", () => {
  it("balance is sales minus expenses", () => {
    expect(totals([tx("sale", 500), tx("sale", 250), tx("expense", 300)])).toEqual({ sales: 750, expenses: 300, balance: 450 });
  });
  it("product is low stock at or below its threshold", () => {
    expect(isLow({ quantity: 5, low_stock_threshold: 5 })).toBe(true);
    expect(isLow({ quantity: 6, low_stock_threshold: 5 })).toBe(false);
  });
  it("stock colour: 0 is out, below 5 is low", () => {
    expect(stockLevel(0)).toBe("out");
    expect(stockLevel(4)).toBe("low");
    expect(stockLevel(5)).toBe("ok");
  });
  it("date filters", () => {
    const now = new Date(2026, 9, 14); // Wed
    expect(dateRange({ kind: "today" }, now)).toEqual(["2026-10-14", "2026-10-14"]);
    expect(dateRange({ kind: "yesterday" }, now)).toEqual(["2026-10-13", "2026-10-13"]);
    expect(dateRange({ kind: "week" }, now)).toEqual(["2026-10-12", "2026-10-14"]);
  });
  it("whatsapp uses wa.me with India code", () => {
    expect(waLink("hi", "98765 43210")).toBe("https://wa.me/919876543210?text=hi");
  });
  it("this month runs from the 1st to today", () => {
    expect(dateRange({ kind: "month" }, new Date(2026, 9, 14))).toEqual(["2026-10-01", "2026-10-14"]);
  });
  it("pending balance sums every customer", () => {
    expect(pendingTotal([{ pending_amount: 200 }, { pending_amount: 0 }, { pending_amount: 150.5 }])).toBe(350.5);
  });
});
