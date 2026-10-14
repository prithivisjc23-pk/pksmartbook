ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'Pcs';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS unit text;

CREATE OR REPLACE FUNCTION public.apply_sale_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.kind = 'sale' AND OLD.product_id IS NOT NULL AND OLD.quantity > 0 THEN
    UPDATE public.products SET quantity = quantity + OLD.quantity WHERE id = OLD.product_id AND user_id = OLD.user_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.kind = 'sale' AND NEW.product_id IS NOT NULL AND NEW.quantity > 0 THEN
    UPDATE public.products SET quantity = GREATEST(0, quantity - NEW.quantity) WHERE id = NEW.product_id AND user_id = NEW.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_sale_stock ON public.transactions;
CREATE TRIGGER trg_sale_stock AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_sale_stock();