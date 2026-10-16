ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _join uuid;
begin
  insert into public.profiles (id, full_name, shop_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'shop_name', right(regexp_replace(coalesce(new.phone,''), '\D', '', 'g'), 10));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  BEGIN _join := nullif(new.raw_user_meta_data->>'join_shop', '')::uuid; EXCEPTION WHEN others THEN _join := NULL; END;
  IF _join IS NOT NULL AND _join <> new.id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _join) THEN
    insert into public.shop_members (owner_id, member_id, contact)
    values (_join, new.id, coalesce(nullif(right(regexp_replace(coalesce(new.phone,''), '\D', '', 'g'), 10), ''), new.id::text))
    on conflict (owner_id, contact) do nothing;
  END IF;
  return new;
end; $$;

-- Super admin: only the verified mobile 9952132396.
CREATE OR REPLACE FUNCTION public.grant_super_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  IF new.phone_confirmed_at IS NOT NULL AND right(regexp_replace(coalesce(new.phone,''), '\D', '', 'g'), 10) = '9952132396' THEN
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict (user_id, role) do nothing;
  END IF;
  return new;
end; $$;
DROP TRIGGER IF EXISTS on_auth_user_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_super_admin AFTER INSERT OR UPDATE OF phone_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE phone_confirmed_at IS NOT NULL AND right(regexp_replace(coalesce(phone,''), '\D', '', 'g'), 10) = '9952132396'
ON CONFLICT (user_id, role) DO NOTHING;