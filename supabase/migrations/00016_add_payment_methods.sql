alter table public.profiles
  add column if not exists zelle_handle text,
  add column if not exists cashapp_handle text,
  add column if not exists paypal_handle text;
