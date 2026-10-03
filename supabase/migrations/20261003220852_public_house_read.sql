-- Shared links work without signing in: anyone can read houses, comments and likes.
-- All writes stay restricted to authenticated users by the existing policies.
alter policy "houses readable by signed-in users" on public.houses rename to "houses are public";
alter policy "houses are public" on public.houses to anon, authenticated;

alter policy "comments readable by signed-in users" on public.comments rename to "comments are public";
alter policy "comments are public" on public.comments to anon, authenticated;

alter policy "likes readable by signed-in users" on public.likes rename to "likes are public";
alter policy "likes are public" on public.likes to anon, authenticated;
