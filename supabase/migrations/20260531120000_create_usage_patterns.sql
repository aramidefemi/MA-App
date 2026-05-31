-- Anonymous device usage tracking (no PII).
-- Client must send header: x-anonymous-id: <device uuid> on every request.

create table public.usage_patterns (
  anonymous_id text primary key,
  first_seen timestamptz not null default now(),
  last_open timestamptz not null default now(),
  previous_open timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.usage_patterns is
  'Per-device anonymous usage signals. No PII. Keyed by client-generated anonymous_id.';

create or replace function public.current_anonymous_id()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    current_setting('request.headers', true)::json ->> 'x-anonymous-id',
    current_setting('request.headers', true)::json ->> 'X-Anonymous-Id'
  );
$$;

create or replace function public.usage_patterns_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger usage_patterns_updated_at
  before update on public.usage_patterns
  for each row
  execute function public.usage_patterns_set_updated_at();

alter table public.usage_patterns enable row level security;

create policy usage_patterns_insert_own
  on public.usage_patterns
  for insert
  to anon
  with check (
    anonymous_id is not null
    and length(anonymous_id) >= 8
    and anonymous_id = public.current_anonymous_id()
  );

create policy usage_patterns_select_own
  on public.usage_patterns
  for select
  to anon
  using (anonymous_id = public.current_anonymous_id());

create policy usage_patterns_update_own
  on public.usage_patterns
  for update
  to anon
  using (anonymous_id = public.current_anonymous_id())
  with check (anonymous_id = public.current_anonymous_id());
