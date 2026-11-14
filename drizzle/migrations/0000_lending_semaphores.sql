
-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  roll_number text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Students read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Students insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Students update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, roll_number)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), split_part(coalesce(new.email,'student'),'@',1)),
    nullif(trim(new.raw_user_meta_data->>'roll_number'),'')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ EQUIPMENT (each row = one counting semaphore) ============
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  icon text not null,
  total integer not null check (total >= 0),
  available integer not null,
  locked integer not null default 0,
  borrowed integer not null default 0,
  requires_id uuid references public.equipment(id),
  sort_order integer not null default 0,
  constraint semaphore_invariant check (
    available >= 0 and locked >= 0 and borrowed >= 0 and available + locked + borrowed = total
  )
);
grant select on public.equipment to anon, authenticated;
grant all on public.equipment to service_role;
alter table public.equipment enable row level security;
create policy "Anyone can view stock" on public.equipment for select to anon, authenticated using (true);

-- ============ RESERVATIONS ============
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id),
  holder_id uuid not null,
  owner_id uuid not null,
  holder_name text not null,
  is_simulation boolean not null default false,
  status text not null default 'locked' check (status in ('locked','borrowed','released','expired','failed','returned')),
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  ended_at timestamptz
);
create index reservations_holder_status_idx on public.reservations (holder_id, status);
create index reservations_status_expiry_idx on public.reservations (status, expires_at);
create index reservations_owner_idx on public.reservations (owner_id, status);
grant select on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "Students see own reservations" on public.reservations for select to authenticated using (auth.uid() = owner_id);

-- ============ SEMAPHORE LOG ============
create table public.semaphore_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default clock_timestamp(),
  equipment_id uuid references public.equipment(id),
  equipment_name text,
  actor text not null,
  level smallint,
  op text not null,
  sem_value integer,
  message text not null
);
create index semaphore_log_created_idx on public.semaphore_log (id desc);
grant select on public.semaphore_log to authenticated;
grant all on public.semaphore_log to service_role;
alter table public.semaphore_log enable row level security;
create policy "Signed-in students view the monitor" on public.semaphore_log for select to authenticated using (true);

-- ============ INTERNAL HELPERS ============
create or replace function public._actor_name(_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(full_name,'') from public.profiles where id = _uid), 'Student');
$$;

create or replace function public._log(_eq uuid, _actor text, _level smallint, _op text, _sem integer, _msg text)
returns void language sql security definer set search_path = public as $$
  insert into public.semaphore_log (equipment_id, equipment_name, actor, level, op, sem_value, message)
  values (_eq, (select name from public.equipment where id = _eq), _actor, _level, _op, _sem, _msg);
$$;

-- signal(S): give one unit back to the counting semaphore
create or replace function public._release(_rid uuid, _new_status text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  r public.reservations;
  v_sem integer;
  v_reason text;
begin
  select * into r from public.reservations where id = _rid for update;
  if not found then return false; end if;
  if _new_status in ('released','expired','failed') and r.status <> 'locked' then return false; end if;
  if _new_status = 'returned' and r.status <> 'borrowed' then return false; end if;

  -- wait(mutex) on the item row: the counter update is a critical section
  perform 1 from public.equipment where id = r.equipment_id for update;
  if r.status = 'locked' then
    update public.equipment set available = available + 1, locked = locked - 1
      where id = r.equipment_id returning available into v_sem;
  else
    update public.equipment set available = available + 1, borrowed = borrowed - 1
      where id = r.equipment_id returning available into v_sem;
  end if;
  update public.reservations set status = _new_status, ended_at = now() where id = _rid;

  v_reason := case _new_status
    when 'expired' then '10-minute lock timed out'
    when 'released' then 'Deselected by student'
    when 'failed' then 'Borrow confirmation failed'
    when 'returned' then 'Item returned to the store'
  end;
  perform public._log(r.equipment_id, r.holder_name, 2::smallint, 'SIGNAL', v_sem,
    format('%s → signal(S): one unit freed, S = %s', v_reason, v_sem));
  return true;
end $$;

-- If a student no longer holds the "parent" item (e.g. racket), dependent items (e.g. shuttle) go back too
create or replace function public._cascade(_holder uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_changed boolean := true;
begin
  while v_changed loop
    v_changed := false;
    for r in
      select res.id, res.status from public.reservations res
      join public.equipment e on e.id = res.equipment_id
      where res.holder_id = _holder and res.status in ('locked','borrowed') and e.requires_id is not null
        and not exists (
          select 1 from public.reservations p
          where p.holder_id = _holder and p.status in ('locked','borrowed') and p.equipment_id = e.requires_id
        )
      order by res.id
    loop
      perform public._release(r.id, case when r.status = 'locked' then 'released' else 'returned' end);
      v_changed := true;
    end loop;
  end loop;
end $$;

-- ============ PUBLIC OPERATIONS ============
create or replace function public.release_expired()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id, holder_id from public.reservations
    where status = 'locked' and expires_at < now()
    order by id
    for update skip locked
  loop
    if public._release(r.id, 'expired') then
      n := n + 1;
      perform public._cascade(r.holder_id);
    end if;
  end loop;
  return n;
end $$;

create or replace function public.acquire_item(p_equipment_id uuid, p_sim_label text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_sim boolean := p_sim_label is not null;
  v_holder uuid;
  v_name text;
  v_seen integer;
  e public.equipment;
  v_active integer;
  v_new integer;
  v_rid uuid;
  v_exp timestamptz;
  v_req text;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  if v_sim then
    v_holder := md5(v_uid::text || ':' || p_sim_label)::uuid;
    v_name := p_sim_label;
  else
    v_holder := v_uid;
    v_name := public._actor_name(v_uid);
  end if;

  perform public.release_expired();

  -- ---------- LEVEL 1: entry gate (non-blocking peek at S) ----------
  select available into v_seen from public.equipment where id = p_equipment_id;
  if not found then raise exception 'Unknown equipment'; end if;
  if v_seen <= 0 then
    perform public._log(p_equipment_id, v_name, 1::smallint, 'BLOCK', v_seen,
      'Level 1: S = 0 — request blocked at the entry gate');
    return jsonb_build_object('status','unavailable','level',1,'seen',v_seen,
      'message','Item unavailable currently — you have to wait until someone releases it.');
  end if;
  perform public._log(p_equipment_id, v_name, 1::smallint, 'ENTER', v_seen,
    format('Level 1 passed: saw S = %s, now waiting for the item mutex', v_seen));

  if v_sim then perform pg_sleep(random() * 0.25); end if;

  -- ---------- LEVEL 2: mutual exclusion ----------
  -- per-student mutex (so one student cannot beat the 3-item limit with parallel clicks)
  perform pg_advisory_xact_lock(hashtextextended(v_holder::text, 0));
  -- item mutex: row lock = critical section; only one process at a time past this line
  select * into e from public.equipment where id = p_equipment_id for update;
  perform public._log(p_equipment_id, v_name, 2::smallint, 'WAIT', e.available,
    'Level 2: wait(mutex) acquired — entered critical section');

  select count(*) into v_active from public.reservations
    where holder_id = v_holder and status in ('locked','borrowed');
  if v_active >= 3 then
    perform public._log(e.id, v_name, 2::smallint, 'DENY', e.available,
      'Limit reached (3 items per student) → signal(mutex), request denied');
    return jsonb_build_object('status','limit','level',2,'seen',v_seen,
      'message','You already hold 3 items — the maximum allowed. Return or release one first.');
  end if;

  if e.requires_id is not null and not exists (
    select 1 from public.reservations
    where holder_id = v_holder and status in ('locked','borrowed') and equipment_id = e.requires_id
  ) then
    select name into v_req from public.equipment where id = e.requires_id;
    perform public._log(e.id, v_name, 2::smallint, 'DENY', e.available,
      format('Dependency missing (%s) → signal(mutex), request denied', v_req));
    return jsonb_build_object('status','dependency','level',2,'seen',v_seen,
      'message', format('Select a %s first — %s can only be borrowed together with it.', v_req, e.name));
  end if;

  if e.available <= 0 then
    perform public._log(e.id, v_name, 2::smallint, 'BLOCK', e.available,
      'Level 2: S = 0 — another process got the last unit first → signal(mutex), must wait');
    return jsonb_build_object('status','race_lost','level',2,'seen',v_seen,
      'message','Item unavailable currently — another student locked it a moment before you. Please wait.');
  end if;

  -- wait(S): take one unit
  update public.equipment set available = available - 1, locked = locked + 1
    where id = e.id returning available into v_new;
  v_exp := now() + interval '10 minutes';
  insert into public.reservations (equipment_id, holder_id, owner_id, holder_name, is_simulation, expires_at)
    values (e.id, v_holder, v_uid, v_name, v_sim, v_exp)
    returning id into v_rid;
  perform public._log(e.id, v_name, 2::smallint, 'LOCK', v_new,
    format('wait(S) succeeded → S = %s. Unit locked for 10 min → signal(mutex), left critical section', v_new));

  return jsonb_build_object('status','acquired','level',2,'seen',v_seen,'reservation_id',v_rid,
    'expires_at',v_exp,'sem_after',v_new,
    'message', format('%s locked for you for 10 minutes.', e.name));
end $$;

create or replace function public.release_item(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.reservations;
begin
  select * into r from public.reservations where id = p_reservation_id;
  if not found or r.owner_id <> auth.uid() then raise exception 'Reservation not found'; end if;
  if not public._release(r.id, 'released') then
    return jsonb_build_object('status','noop');
  end if;
  perform public._cascade(r.holder_id);
  return jsonb_build_object('status','released');
end $$;

create or replace function public.confirm_borrow(p_roll_number text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_roll text;
  v_name text;
  r record;
  n integer := 0;
  v_sem integer;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  perform public.release_expired();
  select roll_number, coalesce(nullif(full_name,''),'Student') into v_roll, v_name from public.profiles where id = v_uid;
  if v_roll is null then raise exception 'Add your roll number to your profile first'; end if;

  if not exists (select 1 from public.reservations where holder_id = v_uid and status = 'locked') then
    return jsonb_build_object('status','empty','message','Nothing is locked for you right now — your locks may have expired.');
  end if;

  if lower(trim(coalesce(p_roll_number,''))) <> lower(trim(v_roll)) then
    for r in select id from public.reservations where holder_id = v_uid and status = 'locked' order by id loop
      perform public._release(r.id, 'failed');
      n := n + 1;
    end loop;
    perform public._log(null, v_name, null, 'FAIL', null,
      format('Confirmation failed (roll number mismatch) → %s locked unit(s) released', n));
    return jsonb_build_object('status','failed','released',n,
      'message','Confirmation failed — roll number did not match. Your locked items were released for others.');
  end if;

  for r in
    select res.id, res.equipment_id from public.reservations res
    where res.holder_id = v_uid and res.status = 'locked' order by res.id for update
  loop
    perform 1 from public.equipment where id = r.equipment_id for update;
    update public.equipment set locked = locked - 1, borrowed = borrowed + 1
      where id = r.equipment_id returning available into v_sem;
    update public.reservations set status = 'borrowed', confirmed_at = now() where id = r.id;
    perform public._log(r.equipment_id, v_name, 2::smallint, 'CONFIRM', v_sem,
      format('Borrow confirmed — lock converted to loan, S stays %s', v_sem));
    n := n + 1;
  end loop;
  return jsonb_build_object('status','confirmed','count',n,'message', format('%s item(s) issued to you. Enjoy the game!', n));
end $$;

create or replace function public.return_item(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.reservations;
begin
  select * into r from public.reservations where id = p_reservation_id;
  if not found or r.owner_id <> auth.uid() then raise exception 'Loan not found'; end if;
  if not public._release(r.id, 'returned') then
    return jsonb_build_object('status','noop');
  end if;
  perform public._cascade(r.holder_id);
  return jsonb_build_object('status','returned');
end $$;

create or replace function public.release_simulation()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select id from public.reservations
    where owner_id = auth.uid() and is_simulation and status = 'locked' order by id
  loop
    if public._release(r.id, 'released') then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- ============ PERMISSIONS ON FUNCTIONS ============
revoke all on function public._actor_name(uuid) from public, anon, authenticated;
revoke all on function public._log(uuid, text, smallint, text, integer, text) from public, anon, authenticated;
revoke all on function public._release(uuid, text) from public, anon, authenticated;
revoke all on function public._cascade(uuid) from public, anon, authenticated;
revoke all on function public.release_expired() from public, anon;
revoke all on function public.acquire_item(uuid, text) from public, anon;
revoke all on function public.release_item(uuid) from public, anon;
revoke all on function public.confirm_borrow(text) from public, anon;
revoke all on function public.return_item(uuid) from public, anon;
revoke all on function public.release_simulation() from public, anon;
grant execute on function public.release_expired() to authenticated;
grant execute on function public.acquire_item(uuid, text) to authenticated;
grant execute on function public.release_item(uuid) to authenticated;
grant execute on function public.confirm_borrow(text) to authenticated;
grant execute on function public.return_item(uuid) to authenticated;
grant execute on function public.release_simulation() to authenticated;

-- ============ REALTIME ============
alter publication supabase_realtime add table public.equipment;
alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.semaphore_log;

-- ============ SEED INVENTORY ============
insert into public.equipment (slug, name, category, icon, total, available, sort_order) values
  ('football', 'Football', 'Football', '⚽', 6, 6, 10),
  ('basketball', 'Basketball', 'Basketball', '🏀', 5, 5, 20),
  ('volleyball', 'Volleyball', 'Volleyball', '🏐', 4, 4, 30),
  ('cricket-bat', 'Cricket Bat', 'Cricket', '🏏', 4, 4, 40),
  ('tennis-racket', 'Tennis Racket', 'Tennis', '🎾', 4, 4, 50),
  ('badminton-racket', 'Badminton Racket', 'Badminton', '🏸', 6, 6, 60),
  ('tt-paddle', 'Table Tennis Paddle', 'Table Tennis', '🏓', 4, 4, 70),
  ('hockey-stick', 'Hockey Stick', 'Hockey', '🏑', 4, 4, 80),
  ('chess-set', 'Chess Set', 'Indoor Games', '♟️', 2, 2, 90),
  ('carrom-board', 'Carrom Board', 'Indoor Games', '🎯', 1, 1, 91),
  ('frisbee', 'Frisbee', 'Field & Fitness', '🥏', 3, 3, 100),
  ('skipping-rope', 'Skipping Rope', 'Field & Fitness', '🪢', 5, 5, 101);

insert into public.equipment (slug, name, category, icon, total, available, sort_order, requires_id) values
  ('cricket-ball', 'Cricket Ball', 'Cricket', '🔴', 6, 6, 41, (select id from public.equipment where slug = 'cricket-bat')),
  ('tennis-balls', 'Tennis Ball Can', 'Tennis', '🟡', 6, 6, 51, (select id from public.equipment where slug = 'tennis-racket')),
  ('shuttlecock', 'Shuttlecock', 'Badminton', '🪶', 10, 10, 61, (select id from public.equipment where slug = 'badminton-racket')),
  ('tt-ball', 'Table Tennis Ball', 'Table Tennis', '⚪', 8, 8, 71, (select id from public.equipment where slug = 'tt-paddle')),
  ('hockey-ball', 'Hockey Ball', 'Hockey', '⚾', 5, 5, 81, (select id from public.equipment where slug = 'hockey-stick'));
