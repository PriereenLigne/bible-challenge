-- BIBLE CHALLENGE — migration 0004 : jours terminés (quiz), notes synchronisées, correctif de apply_reading_events.
-- NON TESTÉE sur une base réelle.

-- CORRECTIF : en SECURITY INVOKER, la RLS de reading_events (lecture seule côté client) pouvait refuser l'insertion.
-- La fonction devient SECURITY DEFINER ; elle vérifie elle-même auth.uid() et la propriété du défi.
create or replace function public.apply_reading_events(ops jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb; res jsonb := '{}'; n int; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'non authentifié'; end if;
  for o in select * from jsonb_array_elements(ops) loop
    begin
      if not exists (select 1 from public.challenges c where c.id = (o->>'challenge_id')::uuid and c.owner_id = v_uid)
         or (o->>'book') !~ '^[A-Z0-9]{3}$' or (o->>'chapter')::int not between 1 and 150 then
        res := res || jsonb_build_object(o->>'op_id', 'rejected'); continue;
      end if;
      insert into public.reading_events(op_id, user_id, challenge_id, book_id, chapter, read_on)
      values ((o->>'op_id')::uuid, v_uid, (o->>'challenge_id')::uuid, o->>'book', (o->>'chapter')::int, (o->>'read_on')::date)
      on conflict do nothing;
      get diagnostics n = row_count;
      res := res || jsonb_build_object(o->>'op_id', case when n = 1 then 'applied' else 'duplicate' end);
    exception when others then
      res := res || jsonb_build_object(o->>'op_id', 'rejected');
    end;
  end loop;
  return res;
end $$;
revoke all on function public.apply_reading_events(jsonb) from public, anon;
grant execute on function public.apply_reading_events(jsonb) to authenticated;

-- Jours terminés : lecture complète + quiz réussi. Le score est déclaré par l'appareil (non vérifiable par le serveur).
create table public.day_completions (
  id uuid primary key default gen_random_uuid(),
  op_id uuid not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day_index int not null check (day_index >= 0),
  score int not null check (score >= 0),
  total int not null check (total > 0),
  completed_on date not null,
  received_at timestamptz not null default now(),
  check (score <= total),
  unique (user_id, challenge_id, day_index)
);
alter table public.day_completions enable row level security;
create policy day_completions_read_own on public.day_completions for select using (user_id = auth.uid());

create or replace function public.apply_day_completions(ops jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb; res jsonb := '{}'; n int; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'non authentifié'; end if;
  for o in select * from jsonb_array_elements(ops) loop
    begin
      if not exists (select 1 from public.challenges c where c.id = (o->>'challenge_id')::uuid and c.owner_id = v_uid) then
        res := res || jsonb_build_object(o->>'op_id', 'rejected'); continue;
      end if;
      insert into public.day_completions(op_id, user_id, challenge_id, day_index, score, total, completed_on)
      values ((o->>'op_id')::uuid, v_uid, (o->>'challenge_id')::uuid, (o->>'day_index')::int, (o->>'score')::int, (o->>'total')::int, (o->>'done_on')::date)
      on conflict do nothing;
      get diagnostics n = row_count;
      res := res || jsonb_build_object(o->>'op_id', case when n = 1 then 'applied' else 'duplicate' end);
    exception when others then
      res := res || jsonb_build_object(o->>'op_id', 'rejected');
    end;
  end loop;
  return res;
end $$;
revoke all on function public.apply_day_completions(jsonb) from public, anon;
grant execute on function public.apply_day_completions(jsonb) to authenticated;

-- Notes : une note par référence (chapitre ou jour de défi). Écriture uniquement via apply_notes.
alter table public.notes alter column id set default gen_random_uuid();
alter table public.notes add column ref_key text not null;
alter table public.notes add constraint notes_user_ref_unique unique (user_id, ref_key);
alter table public.notes add constraint notes_body_len check (char_length(body) <= 20000);

create table public.note_ops (           -- déduplication des opérations de notes
  op_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  applied_at timestamptz not null default now()
);
alter table public.note_ops enable row level security;

drop policy if exists notes_owner on public.notes;
create policy notes_owner_read on public.notes for select using (user_id = auth.uid());

-- Règle de conflit : si la version de base ne correspond pas, la note du serveur est conservée
-- ET le texte reçu est enregistré dans note_conflicts (aucune perte). L'appareil fusionne ensuite.
create or replace function public.apply_notes(ops jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb; res jsonb := '{}'; n int; v_uid uuid := auth.uid();
        v_ref text; v_body text; v_base int; v_cur public.notes;
begin
  if v_uid is null then raise exception 'non authentifié'; end if;
  for o in select * from jsonb_array_elements(ops) loop
    begin
      v_ref := o->>'ref_key'; v_body := o->>'body'; v_base := (o->>'base_version')::int;
      if v_ref is null or v_ref !~ '^(chapter:[A-Z0-9]{3}:[0-9]{1,3}|day:[0-9a-f-]{36}:[0-9]{1,4})$'
         or v_body is null or char_length(v_body) > 20000 or v_base is null or v_base < 0 then
        res := res || jsonb_build_object(o->>'op_id', 'rejected'); continue;
      end if;
      insert into public.note_ops(op_id, user_id) values ((o->>'op_id')::uuid, v_uid) on conflict do nothing;
      get diagnostics n = row_count;
      if n = 0 then res := res || jsonb_build_object(o->>'op_id', 'duplicate'); continue; end if;
      select * into v_cur from public.notes where user_id = v_uid and ref_key = v_ref for update;
      if not found then
        insert into public.notes(user_id, ref_key, body, version) values (v_uid, v_ref, v_body, 1);
        res := res || jsonb_build_object(o->>'op_id', 'applied');
      elsif v_cur.version = v_base then
        update public.notes set body = v_body, version = version + 1, updated_at = now() where id = v_cur.id;
        res := res || jsonb_build_object(o->>'op_id', 'applied');
      else
        insert into public.note_conflicts(note_id, user_id, body, base_version) values (v_cur.id, v_uid, v_body, v_base);
        res := res || jsonb_build_object(o->>'op_id', 'conflict');
      end if;
    exception when others then
      res := res || jsonb_build_object(o->>'op_id', 'rejected');
    end;
  end loop;
  return res;
end $$;
revoke all on function public.apply_notes(jsonb) from public, anon;
grant execute on function public.apply_notes(jsonb) to authenticated;
