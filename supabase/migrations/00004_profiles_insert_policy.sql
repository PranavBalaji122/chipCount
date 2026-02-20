-- Allow authenticated users to create their own profile row.
-- This supports older auth users that existed before the signup trigger was added.
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);
