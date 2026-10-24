-- BIBLE CHALLENGE — migration 0003 : équipes, invitations par code, défis partagés.
-- NON TESTÉE sur une base réelle. Appliquer d'abord sur un projet de développement.
-- Principes de sécurité : aucune écriture directe sur teams / team_members / team_invites par le client ;
-- tout passe par des fonctions SECURITY DEFINER qui vérifient auth.uid() et les rôles.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  description text check (description is null or char_length(description) <= 500),
  -- restrict : un créateur doit transférer l'équipe avant de supprimer son compte
  created_by uuid not null references public.profiles(id) on delete restrict,
  -- défi commun facultatif (calendrier identique pour tous les membres)
  scope text,
  book_ids text[] check (book_ids is null or cardinality(book_ids) between 1 and 66),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  check ((book_ids is null) = (start_date is null) and (start_date is null) = (end_date is null)),
  check (end_date is null or end_date >= start_date)
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('creator','leader','moderator','member')),
  share_progress boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index on public.team_members(user_id);

create table public.team_invites (
  code text primary key check (code ~ '^[A-F0-9]{12}$'),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  max_uses int check (max_uses is null or max_uses > 0),
  uses int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.team_invites(team_id);

-- Chaque membre a SON défi (même calendrier), rattaché à l'équipe
alter table public.challenges add column team_id uuid references public.teams(id) on delete set null;
create unique index challenges_one_per_team on public.challenges(owner_id, team_id) where team_id is not null;
create index on public.challenges(team_id);

-- Aides aux politiques (évitent la récursion des politiques RLS)
create or replace function public.is_team_member(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid())
$$;
create or replace function public.is_team_leader(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid() and role in ('creator','leader'))
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
create policy teams_member_read on public.teams for select using (public.is_team_member(id));
create policy team_members_own_read on public.team_members for select using (user_id = auth.uid());
create policy team_invites_leader_read on public.team_invites for select using (public.is_team_leader(team_id));

-- Un défi ne peut être rattaché qu'à une équipe dont on est membre
drop policy if exists challenges_owner on public.challenges;
create policy challenges_owner on public.challenges for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (team_id is null or public.is_team_member(team_id)));

-- INTERNE : crée le défi commun d'un membre (non exposée au client)
create or replace function public.ensure_team_challenge(p_team uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.challenges (owner_id, title, scope, book_ids, start_date, end_date, status, team_id)
  select p_user, t.name, coalesce(t.scope, 'custom'), t.book_ids, t.start_date, t.end_date,
         case when t.start_date <= current_date then 'active' else 'planned' end, t.id
  from public.teams t
  where t.id = p_team and t.book_ids is not null
  on conflict (owner_id, team_id) where team_id is not null do nothing;
end $$;

create or replace function public.create_team(p_name text, p_description text, p_scope text, p_book_ids text[], p_start date, p_end date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_team uuid;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'Profil introuvable : reconnectez-vous'; end if;
  insert into public.teams (name, description, created_by, scope, book_ids, start_date, end_date)
  values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''), v_uid, p_scope, p_book_ids, p_start, p_end)
  returning id into v_team;
  insert into public.team_members (team_id, user_id, role) values (v_team, v_uid, 'creator');
  perform public.ensure_team_challenge(v_team, v_uid);
  return v_team;
end $$;

create or replace function public.create_team_invite(p_team uuid, p_days int, p_max_uses int) returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_code text;
begin
  if not public.is_team_leader(p_team) then raise exception 'Réservé aux responsables de l''équipe'; end if;
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'Durée de validité : 1 à 90 jours'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.team_invites (code, team_id, created_by, expires_at, max_uses)
  values (v_code, p_team, v_uid, now() + make_interval(days => p_days), p_max_uses);
  return v_code;
end $$;

create or replace function public.revoke_team_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.team_invites set revoked_at = now()
  where code = upper(trim(p_code)) and revoked_at is null and public.is_team_leader(team_id);
  if not found then raise exception 'Invitation introuvable'; end if;
end $$;

create or replace function public.join_team_by_code(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_inv public.team_invites;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'Profil introuvable : reconnectez-vous'; end if;
  select * into v_inv from public.team_invites where code = upper(trim(p_code)) for update;
  if not found or v_inv.revoked_at is not null or v_inv.expires_at < now()
     or (v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses) then
    raise exception 'Code invalide, expiré ou révoqué';
  end if;
  if public.is_team_member(v_inv.team_id) then return v_inv.team_id; end if; -- déjà membre : rien à consommer
  insert into public.team_members (team_id, user_id, role) values (v_inv.team_id, v_uid, 'member');
  update public.team_invites set uses = uses + 1 where code = v_inv.code;
  perform public.ensure_team_challenge(v_inv.team_id, v_uid);
  return v_inv.team_id;
end $$;

create or replace function public.leave_team(p_team uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_role text;
begin
  select role into v_role from public.team_members where team_id = p_team and user_id = v_uid;
  if not found then raise exception 'Vous ne faites pas partie de cette équipe'; end if;
  if v_role = 'creator' then raise exception 'Le créateur ne peut pas quitter l''équipe (transfert de responsabilité à venir)'; end if;
  delete from public.team_members where team_id = p_team and user_id = v_uid;
  update public.challenges set team_id = null where owner_id = v_uid and team_id = p_team; -- votre historique reste le vôtre
end $$;

create or replace function public.set_team_sharing(p_team uuid, p_share boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.team_members set share_progress = p_share where team_id = p_team and user_id = auth.uid();
  if not found then raise exception 'Vous ne faites pas partie de cette équipe'; end if;
end $$;

-- Progression des membres : la progression d'un membre qui ne partage pas reste masquée (sauf à lui-même)
create or replace function public.team_progress(p_team uuid)
returns table (user_id uuid, display_name text, role text, shares boolean, chapters_read int, last_read_on date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_team_member(p_team) then raise exception 'Accès refusé'; end if;
  return query
  select m.user_id, p.display_name, m.role, m.share_progress,
         case when m.share_progress or m.user_id = auth.uid() then coalesce(r.n, 0)::int else null end,
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
  where m.team_id = p_team
  order by m.joined_at;
end $$;

-- Droits : le client n'appelle que les fonctions publiques ; ensure_team_challenge reste interne
revoke all on function public.ensure_team_challenge(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_team(text, text, text, text[], date, date) from public, anon;
revoke all on function public.create_team_invite(uuid, int, int) from public, anon;
revoke all on function public.revoke_team_invite(text) from public, anon;
revoke all on function public.join_team_by_code(text) from public, anon;
revoke all on function public.leave_team(uuid) from public, anon;
revoke all on function public.set_team_sharing(uuid, boolean) from public, anon;
revoke all on function public.team_progress(uuid) from public, anon;
revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.is_team_leader(uuid) from public, anon;
grant execute on function public.create_team(text, text, text, text[], date, date) to authenticated;
grant execute on function public.create_team_invite(uuid, int, int) to authenticated;
grant execute on function public.revoke_team_invite(text) to authenticated;
grant execute on function public.join_team_by_code(text) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.set_team_sharing(uuid, boolean) to authenticated;
grant execute on function public.team_progress(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_leader(uuid) to authenticated;
