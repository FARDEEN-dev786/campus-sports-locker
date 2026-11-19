ALTER TABLE public.semaphore_log ADD COLUMN IF NOT EXISTS owner_id uuid;
CREATE INDEX IF NOT EXISTS semaphore_log_owner_id_idx ON public.semaphore_log (owner_id, id DESC);

CREATE OR REPLACE FUNCTION public._log(_eq uuid, _actor text, _level smallint, _op text, _sem integer, _msg text, _owner uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  insert into public.semaphore_log (equipment_id, equipment_name, actor, level, op, sem_value, message, owner_id)
  values (_eq, (select name from public.equipment where id = _eq), _actor, _level, _op, _sem, _msg, _owner);
$$;
REVOKE ALL ON FUNCTION public._log(uuid, text, smallint, text, integer, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._log(uuid, text, smallint, text, integer, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public._log(_eq uuid, _actor text, _level smallint, _op text, _sem integer, _msg text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  select public._log(_eq, _actor, _level, _op, _sem, _msg, auth.uid());
$$;
REVOKE ALL ON FUNCTION public._log(uuid, text, smallint, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._log(uuid, text, smallint, text, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public._release(_rid uuid, _new_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- the log entry belongs to the student who owned the reservation
  perform public._log(r.equipment_id, r.holder_name, 2::smallint, 'SIGNAL', v_sem,
    format('%s → signal(S): one unit freed, S = %s', v_reason, v_sem), r.owner_id);
  return true;
end
$$;
REVOKE ALL ON FUNCTION public._release(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._release(uuid, text) TO service_role;

DROP POLICY IF EXISTS "Signed-in students view the monitor" ON public.semaphore_log;
CREATE POLICY "Students view their own semaphore log"
  ON public.semaphore_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);