ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'shop';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;

-- Login is mobile + password; auth email is synthetic "<10 digits>@pksmartbook.app".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _m text;
begin
  _m := coalesce(nullif(right(regexp_replace(coalesce(new.phone,''), '\D', '', 'g'), 10), ''), nullif(split_part(coalesce(new.email,''), '@', 1), ''));
  insert into public.profiles (id, full_name, shop_name, phone, district, account_type)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'shop_name', _m,
          new.raw_user_meta_data->>'district',
          CASE WHEN new.raw_user_meta_data->>'account_type' = 'personal' THEN 'personal' ELSE 'shop' END);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  IF lower(coalesce(new.email,'')) = '9952132396@pksmartbook.app' THEN
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict (user_id, role) do nothing;
  END IF;
  return new;
end; $$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = '9952132396@pksmartbook.app'
ON CONFLICT (user_id, role) DO NOTHING;