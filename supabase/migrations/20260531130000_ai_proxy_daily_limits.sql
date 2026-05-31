-- Daily AI proxy quota per anonymous device (edge function only; no client direct access).

create table public.ai_proxy_usage (
  anonymous_id text not null,
  usage_date date not null default (timezone('utc', now()))::date,
  request_count int not null default 0,
  primary key (anonymous_id, usage_date),
  constraint ai_proxy_usage_anonymous_id_len check (char_length(anonymous_id) >= 8),
  constraint ai_proxy_usage_request_count_nonneg check (request_count >= 0)
);

comment on table public.ai_proxy_usage is
  'Per-device daily AI proxy request counts. Updated only via consume_ai_proxy_quota (service role).';

alter table public.ai_proxy_usage enable row level security;

-- No policies: anon/authenticated cannot read or write. Edge function uses service role.

create or replace function public.consume_ai_proxy_quota(
  p_anonymous_id text,
  p_daily_limit int default 50
)
returns table (allowed boolean, request_count int, daily_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_date date := (timezone('utc', now()))::date;
begin
  if p_anonymous_id is null or char_length(p_anonymous_id) < 8 then
    return query select false, 0, p_daily_limit;
    return;
  end if;

  insert into public.ai_proxy_usage (anonymous_id, usage_date, request_count)
  values (p_anonymous_id, v_date, 1)
  on conflict (anonymous_id, usage_date)
  do update set request_count = public.ai_proxy_usage.request_count + 1
  returning public.ai_proxy_usage.request_count into v_count;

  return query select (v_count <= p_daily_limit), v_count, p_daily_limit;
end;
$$;

revoke all on function public.consume_ai_proxy_quota(text, int) from public;
grant execute on function public.consume_ai_proxy_quota(text, int) to service_role;
