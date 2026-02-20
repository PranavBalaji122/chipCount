alter table public.profiles
add constraint profiles_display_name_key unique (display_name);
