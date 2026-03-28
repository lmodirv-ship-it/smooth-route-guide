-- In-app voice calling: secure signaling tables for WebRTC call invitations and ICE exchange
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid not null,
  caller_id uuid not null,
  callee_id uuid not null,
  status text not null default 'ringing',
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.call_sessions enable row level security;

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  sender_id uuid not null,
  recipient_id uuid not null,
  signal_type text not null,
  payload jsonb not null default '{}'::jsonb
);

alter table public.call_signals enable row level security;

create index if not exists idx_call_sessions_caller_id on public.call_sessions(caller_id);
create index if not exists idx_call_sessions_callee_id on public.call_sessions(callee_id);
create index if not exists idx_call_sessions_status on public.call_sessions(status);
create index if not exists idx_call_signals_call_id on public.call_signals(call_id);
create index if not exists idx_call_signals_recipient_id on public.call_signals(recipient_id);

create or replace function public.touch_call_session_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_call_session_updated_at
before update on public.call_sessions
for each row
execute function public.touch_call_session_updated_at();

create policy "Participants can view own call sessions"
on public.call_sessions
for select
to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "Authenticated users can create own outgoing calls"
on public.call_sessions
for insert
to authenticated
with check (auth.uid() = created_by and auth.uid() = caller_id and caller_id <> callee_id);

create policy "Participants can update own call sessions"
on public.call_sessions
for update
to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id)
with check (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "Admins can manage all call sessions"
on public.call_sessions
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Participants can view own signals"
on public.call_signals
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Participants can send own signals"
on public.call_signals
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and sender_id <> recipient_id
  and exists (
    select 1
    from public.call_sessions cs
    where cs.id = call_id
      and (auth.uid() = cs.caller_id or auth.uid() = cs.callee_id)
      and (recipient_id = cs.caller_id or recipient_id = cs.callee_id)
  )
);

create policy "Admins can manage all signals"
on public.call_signals
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

alter publication supabase_realtime add table public.call_sessions;
alter publication supabase_realtime add table public.call_signals;