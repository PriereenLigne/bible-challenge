-- Scénario : suppression de compte (migration 0006). Chaque ligne du tableau final doit avoir la valeur attendue en commentaire.
\set ON_ERROR_STOP 1
-- A = 0…a, B = 0…b, C = 0…c
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000000a','a@x'),('00000000-0000-0000-0000-00000000000b','b@x'),('00000000-0000-0000-0000-00000000000c','c@x');
insert into public.profiles(id,display_name) values ('00000000-0000-0000-0000-00000000000a','A'),('00000000-0000-0000-0000-00000000000b','B'),('00000000-0000-0000-0000-00000000000c','C');
-- équipe 1 créée par A, avec B (membre, plus ancien) et C (responsable) ; équipe 2 créée par A, seule
insert into public.teams(id,name,created_by) values ('10000000-0000-0000-0000-000000000001','Famille','00000000-0000-0000-0000-00000000000a'),('10000000-0000-0000-0000-000000000002','Solo','00000000-0000-0000-0000-00000000000a');
insert into public.team_members(team_id,user_id,role,joined_at) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','creator', now()-interval '3 day'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','member',  now()-interval '2 day'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000c','leader',  now()-interval '1 day'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000a','creator', now());
insert into public.team_invites(code,team_id,created_by,expires_at) values ('ABCDEF123456','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a', now()+interval '1 day');
insert into public.challenges(owner_id,title,scope,book_ids,start_date,end_date,team_id) values
 ('00000000-0000-0000-0000-00000000000a','Défi A','nt','{MAT}','2026-01-01','2026-02-01','10000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-00000000000b','Défi B','nt','{MAT}','2026-01-01','2026-02-01','10000000-0000-0000-0000-000000000001');
insert into public.notes(id,user_id,body,ref_key) values (gen_random_uuid(),'00000000-0000-0000-0000-00000000000a','note A','chapter:JHN:3'),(gen_random_uuid(),'00000000-0000-0000-0000-00000000000b','note B','chapter:JHN:3');
insert into public.verse_marks(user_id,book_id,chapter,verse,favorite,client_ts) values ('00000000-0000-0000-0000-00000000000a','JHN',3,16,true,1);

-- 1) un visiteur non connecté ne peut pas l'appeler
set role anon;
do $$ begin perform public.delete_my_account(); raise exception 'ÉCHEC : anon a pu appeler la fonction'; exception when insufficient_privilege then raise notice 'OK : anon refusé'; end $$;
reset role;

-- 2) A supprime son compte
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', false);
select public.delete_my_account();
reset role;

do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a'; b uuid := '00000000-0000-0000-0000-00000000000b'; c uuid := '00000000-0000-0000-0000-00000000000c';
  t1 uuid := '10000000-0000-0000-0000-000000000001'; t2 uuid := '10000000-0000-0000-0000-000000000002';
begin
  if exists (select 1 from auth.users where id = a) then raise exception 'compte A encore présent'; end if;
  if exists (select 1 from public.profiles where id = a) then raise exception 'profil A encore présent'; end if;
  if exists (select 1 from public.challenges where owner_id = a) then raise exception 'défis de A encore présents'; end if;
  if exists (select 1 from public.notes where user_id = a) then raise exception 'notes de A encore présentes'; end if;
  if exists (select 1 from public.verse_marks where user_id = a) then raise exception 'favoris de A encore présents'; end if;
  if exists (select 1 from public.team_invites where created_by = a) then raise exception 'invitations de A encore présentes'; end if;
  if exists (select 1 from public.teams where id = t2) then raise exception 'équipe où A était seul encore présente'; end if;
  if not exists (select 1 from public.teams where id = t1 and created_by = c) then raise exception 'équipe Famille non transmise au responsable C'; end if;
  if not exists (select 1 from public.team_members where team_id = t1 and user_id = c and role = 'creator') then raise exception 'C n''est pas devenu créateur'; end if;
  if (select count(*) from public.team_members where team_id = t1) <> 2 then raise exception 'membres de Famille incorrects'; end if;
  if (select count(*) from public.challenges where owner_id = b) <> 1 or (select count(*) from public.notes where user_id = b) <> 1 then raise exception 'données de B touchées'; end if;
  raise notice 'OK : suppression complète, équipe transmise, autres utilisateurs intacts';
end $$;

-- 3) sans connexion : refus explicite
set role authenticated;
select set_config('request.jwt.claim.sub','', false);
do $$ begin perform public.delete_my_account(); raise exception 'ÉCHEC : appel accepté sans connexion'; exception when raise_exception then if sqlerrm like 'ÉCHEC%' then raise; end if; raise notice 'OK : refus sans connexion (%)', sqlerrm; end $$;
