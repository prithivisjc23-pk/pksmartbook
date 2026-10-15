CREATE TABLE public.shop_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  member_id uuid,
  contact text NOT NULL,
  role text NOT NULL DEFAULT 'cashier' CHECK (role IN ('cashier')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, contact)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_members TO authenticated;
GRANT ALL ON public.shop_members TO service_role;
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages staff" ON public.shop_members FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "member sees own membership" ON public.shop_members FOR SELECT TO authenticated
  USING (member_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_shop_staff(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shop_members WHERE owner_id = _owner AND member_id = auth.uid())
$$;

-- Links pending invites to the signed-in user (by email or last 10 phone digits), returns the shop id to work in.
CREATE OR REPLACE FUNCTION public.claim_shop()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _phone text; _owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT lower(email), right(regexp_replace(coalesce(phone,''), '\D', '', 'g'), 10) INTO _email, _phone FROM auth.users WHERE id = auth.uid();
  UPDATE public.shop_members SET member_id = auth.uid()
   WHERE member_id IS NULL AND owner_id <> auth.uid()
     AND ((_email IS NOT NULL AND contact = _email) OR (_phone <> '' AND contact = _phone));
  SELECT owner_id INTO _owner FROM public.shop_members WHERE member_id = auth.uid() ORDER BY created_at LIMIT 1;
  RETURN coalesce(_owner, auth.uid());
END $$;

CREATE POLICY "staff read txns" ON public.transactions FOR SELECT TO authenticated USING (public.is_shop_staff(user_id));
CREATE POLICY "staff add txns" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.is_shop_staff(user_id));
CREATE POLICY "staff read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_shop_staff(user_id));
CREATE POLICY "staff read products" ON public.products FOR SELECT TO authenticated USING (public.is_shop_staff(user_id));
CREATE POLICY "staff read shop profile" ON public.profiles FOR SELECT TO authenticated USING (public.is_shop_staff(id));

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS on_credit boolean NOT NULL DEFAULT false;

-- Stock + customer credit adjustments run as definer so cashier sales still update the owner's rows (scoped by user_id).
CREATE OR REPLACE FUNCTION public.apply_sale_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.kind = 'sale' THEN
    IF OLD.product_id IS NOT NULL AND OLD.quantity > 0 THEN
      UPDATE public.products SET quantity = quantity + OLD.quantity WHERE id = OLD.product_id AND user_id = OLD.user_id;
    END IF;
    IF OLD.on_credit AND OLD.customer_id IS NOT NULL THEN
      UPDATE public.customers SET pending_amount = GREATEST(0, pending_amount - OLD.amount) WHERE id = OLD.customer_id AND user_id = OLD.user_id;
    END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.kind = 'sale' THEN
    IF NEW.product_id IS NOT NULL AND NEW.quantity > 0 THEN
      UPDATE public.products SET quantity = GREATEST(0, quantity - NEW.quantity) WHERE id = NEW.product_id AND user_id = NEW.user_id;
    END IF;
    IF NEW.on_credit AND NEW.customer_id IS NOT NULL THEN
      UPDATE public.customers SET pending_amount = pending_amount + NEW.amount WHERE id = NEW.customer_id AND user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions, public.customers, public.products;