-- BIBLE CHALLENGE — migration 0005, version « une seule commande » pour l'éditeur SQL.
-- Désactivez « Lecture seule », collez TOUT, cliquez sur Run. NON TESTÉE sur une base réelle.
do $migration$
begin
-- BIBLE CHALLENGE — migration 0005 : classement d'équipe (désactivable), favoris et surlignage de versets.
-- NON TESTÉE sur une base réelle.

alter table public.teams add column show_ranking boolean not null default true;

create or replace function public.set_team_ranking(p_team uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_leader(p_team) then raise exception 'Réservé aux responsables de l''équipe'; end if;
  update public.teams set show_ranking = p_on where id = p_team;
end $$;
revoke all on function public.set_team_ranking(uuid, boolean) from public, anon;
grant execute on function public.set_team_ranking(uuid, boolean) to authenticated;

-- team_progress gagne la colonne days_done (jours terminés = lecture + quiz). Le type de retour change : on la recrée.
drop function if exists public.team_progress(uuid);
create function public.team_progress(p_team uuid)
returns table (user_id uuid, display_name text, role text, shares boolean, chapters_read int, days_done int, last_read_on date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_team_member(p_team) then raise exception 'Accès refusé'; end if;
  return query
  select m.user_id, p.display_name, m.role, m.share_progress,
         case when m.share_progress or m.user_id = auth.uid() then coalesce(r.n, 0)::int else null end,
         case when m.share_progress or m.user_id = auth.uid() then coalesce(d.n, 0)::int else null end,
         case when m.share_progress or m.user_id = auth.uid() then r.last_on else null end
  from public.team_members m
  join public.profiles p on p.id = m.user_id
  left join lateral (
    select count(*) as n, max(e.read_on) as last_on
    from public.reading_events e
    join public.challenges c on c.id = e.challenge_id
    join public.teams t on t.id = c.team_id
    where c.owner_id = m.user_id and e.user_id = m.user_id and c.team_id = p_team
      and e.book_id = any (coalesce(t.book_ids, '{}'::text[]))
  ) r on true
  left join lateral (
    select count(*) as n
    from public.day_completions dc
    join public.challenges c2 on c2.id = dc.challenge_id
    where c2.owner_id = m.user_id and dc.user_id = m.user_id and c2.team_id = p_team
  ) d on true
  where m.team_id = p_team
  order by m.joined_at;
end $$;
revoke all on function public.team_progress(uuid) from public, anon;
grant execute on function public.team_progress(uuid) to authenticated;

-- Favoris et surlignage : une ligne par verset. Dernier écrit gagne (client_ts). Une suppression est une ligne « vide » (tombstone),
-- ce qui empêche une ancienne opération hors ligne de ressusciter un surlignage retiré.
create table public.verse_marks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id text not null check (book_id ~ '^[A-Z0-9]{3}$'),
  chapter int not null check (chapter between 1 and 150),
  verse int not null check (verse between 1 and 200),
  favorite boolean not null default false,
  color text check (color is null or color in ('jaune','vert','bleu','rose','orange')),
  client_ts bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id, chapter, verse)
);
alter table public.verse_marks enable row level security;
create policy verse_marks_read_own on public.verse_marks for select using (user_id = auth.uid());

create or replace function public.apply_verse_marks(ops jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb; res jsonb := '{}'; n int; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'non authentifié'; end if;
  for o in select * from jsonb_array_elements(ops) loop
    begin
      insert into public.verse_marks (user_id, book_id, chapter, verse, favorite, color, client_ts)
      values (v_uid, o->>'book', (o->>'chapter')::int, (o->>'verse')::int,
              coalesce((o->>'favorite')::boolean, false), nullif(o->>'color', ''), (o->>'ts')::bigint)
      on conflict (user_id, book_id, chapter, verse) do update
        set favorite = excluded.favorite, color = excluded.color, client_ts = excluded.client_ts, updated_at = now()
        where public.verse_marks.client_ts < excluded.client_ts;
      get diagnostics n = row_count;
      res := res || jsonb_build_object(o->>'op_id', case when n > 0 then 'applied' else 'duplicate' end);
    exception when others then
      res := res || jsonb_build_object(o->>'op_id', 'rejected');
    end;
  end loop;
  return res;
end $$;
revoke all on function public.apply_verse_marks(jsonb) from public, anon;
grant execute on function public.apply_verse_marks(jsonb) to authenticated;

end
$migration$;
