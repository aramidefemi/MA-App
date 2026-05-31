-- BYOK NVIDIA keys per anonymous device. Readable only via service_role (edge function).

create table public.user_ai_keys (
  anonymous_id text primary key,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_ai_keys_anonymous_id_len check (char_length(anonymous_id) >= 8),
  constraint user_ai_keys_api_key_prefix check (api_key like 'nvapi-%')
);

comment on table public.user_ai_keys is
  'Per-device BYOK NVIDIA API keys. No client SELECT; edge function reads via get_user_ai_key (service role).';

create trigger user_ai_keys_updated_at
  before update on public.user_ai_keys
  for each row
  execute function public.usage_patterns_set_updated_at();

alter table public.user_ai_keys enable row level security;

-- No policies: anon cannot read or write directly. Client uses SECURITY DEFINER RPCs.

create or replace function public.has_user_ai_key()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_ai_keys
    where anonymous_id = public.current_anonymous_id()
  );
$$;

create or replace function public.upsert_user_ai_key(p_api_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := public.current_anonymous_id();
begin
  if v_id is null or char_length(v_id) < 8 then
    raise exception 'Missing or invalid x-anonymous-id header';
  end if;
  if p_api_key is null or trim(p_api_key) not like 'nvapi-%' then
    raise exception 'Invalid NVIDIA API key';
  end if;

  insert into public.user_ai_keys (anonymous_id, api_key)
  values (v_id, trim(p_api_key))
  on conflict (anonymous_id) do update set
    api_key = excluded.api_key,
    updated_at = now();
end;
$$;

create or replace function public.delete_user_ai_key()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := public.current_anonymous_id();
begin
  if v_id is null or char_length(v_id) < 8 then
    raise exception 'Missing or invalid x-anonymous-id header';
  end if;

  delete from public.user_ai_keys where anonymous_id = v_id;
end;
$$;

create or replace function public.get_user_ai_key(p_anonymous_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select api_key from public.user_ai_keys
  where anonymous_id = p_anonymous_id
  limit 1;
$$;

revoke all on function public.has_user_ai_key() from public;
revoke all on function public.upsert_user_ai_key(text) from public;
revoke all on function public.delete_user_ai_key() from public;
revoke all on function public.get_user_ai_key(text) from public;

grant execute on function public.has_user_ai_key() to anon;
grant execute on function public.upsert_user_ai_key(text) to anon;
grant execute on function public.delete_user_ai_key() to anon;
grant execute on function public.get_user_ai_key(text) to service_role;
