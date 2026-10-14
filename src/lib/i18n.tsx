import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const en = {
  appName: "PK SmartBook AI",
  tagline: "Your shop's money, made simple.",
  heroText: "Track sales, expenses, customers and stock — no accounting knowledge needed.",
  getStarted: "Get started free",
  signIn: "Sign in",
  signUp: "Create account",
  signOut: "Sign out",
  email: "Email",
  password: "Password",
  fullName: "Your name",
  shopName: "Shop name",
  google: "Continue with Google",
  noAccount: "New here? Create an account",
  haveAccount: "Already have an account? Sign in",
  checkEmail: "Check your email to confirm your account.",
  dashboard: "Dashboard",
  sales: "Sales",
  expenses: "Expenses",
  records: "Records",
  customers: "Customers",
  inventory: "Stock",
  admin: "Admin",
  totalSales: "Total sales",
  totalExpenses: "Total expenses",
  balance: "Balance",
  pending: "Pending payments",
  lowStock: "Low stock alerts",
  allGood: "All good! Nothing low.",
  recent: "Recent records",
  addSale: "Add sale",
  addExpense: "Add expense",
  add: "Add",
  save: "Save",
  edit: "Edit",
  delete: "Delete",
  cancel: "Cancel",
  amount: "Amount (₹)",
  description: "What was it for?",
  category: "Category",
  date: "Date",
  customer: "Customer",
  none: "None",
  name: "Name",
  phone: "Phone",
  pendingAmount: "Pending amount (₹)",
  notes: "Notes",
  addCustomer: "Add customer",
  product: "Product",
  quantity: "Quantity",
  threshold: "Alert when below",
  price: "Price (₹)",
  addProduct: "Add product",
  empty: "Nothing here yet.",
  all: "All",
  markPaid: "Mark paid",
  low: "Low",
  users: "Shops",
  adminOnly: "Only admins can see this page.",
  saved: "Saved",
  deleted: "Deleted",
  waReminder: "WhatsApp reminder",
  printReceipt: "Receipt",
  receiptNo: "Receipt no",
  receiptThanks: "Thank you! Visit again.",
  waMsg: (name: string, amount: string, shop: string) =>
    `Hello ${name}, this is a friendly reminder from ${shop}. Your pending balance is ${amount}. Please pay when convenient. Thank you!`,
};
type Dict = typeof en;
const ta: Dict = {
  appName: "PK ஸ்மார்ட்புக் AI",
  tagline: "உங்கள் கடையின் கணக்கு, எளிமையாக.",
  heroText: "விற்பனை, செலவு, வாடிக்கையாளர், சரக்கு — கணக்கியல் அறிவு தேவையில்லை.",
  getStarted: "இலவசமாக தொடங்குங்கள்",
  signIn: "உள்நுழை",
  signUp: "கணக்கு உருவாக்கு",
  signOut: "வெளியேறு",
  email: "மின்னஞ்சல்",
  password: "கடவுச்சொல்",
  fullName: "உங்கள் பெயர்",
  shopName: "கடையின் பெயர்",
  google: "Google மூலம் தொடரவும்",
  noAccount: "புதியவரா? கணக்கு உருவாக்குங்கள்",
  haveAccount: "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழையுங்கள்",
  checkEmail: "உங்கள் மின்னஞ்சலை சரிபார்த்து கணக்கை உறுதிப்படுத்துங்கள்.",
  dashboard: "முகப்பு",
  sales: "விற்பனை",
  expenses: "செலவுகள்",
  records: "பதிவுகள்",
  customers: "வாடிக்கையாளர்கள்",
  inventory: "சரக்கு",
  admin: "நிர்வாகம்",
  totalSales: "மொத்த விற்பனை",
  totalExpenses: "மொத்த செலவு",
  balance: "இருப்பு",
  pending: "நிலுவை தொகை",
  lowStock: "குறைந்த சரக்கு எச்சரிக்கை",
  allGood: "எல்லாம் சரி! குறைவு இல்லை.",
  recent: "சமீபத்திய பதிவுகள்",
  addSale: "விற்பனை சேர்",
  addExpense: "செலவு சேர்",
  add: "சேர்",
  save: "சேமி",
  edit: "திருத்து",
  delete: "நீக்கு",
  cancel: "ரத்து",
  amount: "தொகை (₹)",
  description: "எதற்காக?",
  category: "வகை",
  date: "தேதி",
  customer: "வாடிக்கையாளர்",
  none: "இல்லை",
  name: "பெயர்",
  phone: "தொலைபேசி",
  pendingAmount: "நிலுவை (₹)",
  notes: "குறிப்புகள்",
  addCustomer: "வாடிக்கையாளர் சேர்",
  product: "பொருள்",
  quantity: "அளவு",
  threshold: "இதற்குக் கீழ் எச்சரி",
  price: "விலை (₹)",
  addProduct: "பொருள் சேர்",
  empty: "இன்னும் எதுவும் இல்லை.",
  all: "அனைத்தும்",
  markPaid: "செலுத்தப்பட்டது",
  low: "குறைவு",
  users: "கடைகள்",
  adminOnly: "நிர்வாகிகள் மட்டுமே இதைப் பார்க்க முடியும்.",
  saved: "சேமிக்கப்பட்டது",
  deleted: "நீக்கப்பட்டது",
  waReminder: "WhatsApp நினைவூட்டல்",
  printReceipt: "ரசீது",
  receiptNo: "ரசீது எண்",
  receiptThanks: "நன்றி! மீண்டும் வாருங்கள்.",
  waMsg: (name: string, amount: string, shop: string) =>
    `வணக்கம் ${name}, ${shop} கடையிலிருந்து நட்பான நினைவூட்டல். உங்கள் நிலுவை தொகை ${amount}. வசதியானபோது செலுத்தவும். நன்றி!`,
};

export type Lang = "en" | "ta";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: <K extends keyof Dict>(k: K) => Dict[K] };
const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => en[k] as never });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = localStorage.getItem("sollubook-lang");
    if (s === "ta" || s === "en") setLangState(s);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("sollubook-lang", l);
  };
  const dict = lang === "ta" ? ta : en;
  return (
    <I18nContext.Provider value={{ lang, setLang, t: (k) => dict[k] as never }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
