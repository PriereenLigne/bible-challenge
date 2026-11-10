-- BIBLE CHALLENGE — migration 0006 : suppression de son propre compte depuis l'application.
-- Testée sur PostgreSQL 16 avec une reproduction minimale du schéma « auth » de Supabase.
--
-- Effet : supprime l'utilisateur de auth.users ; tout le reste (profil, défis, lectures, notes, favoris,
-- appartenances aux équipes, invitations) part en cascade. Les équipes qu'il a créées sont d'abord
-- transmises au membre le plus ancien (de préférence un responsable), ou supprimées s'il était seul.

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_team record;
  v_heir uuid;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;

  for v_team in select id from public.teams where created_by = v_uid loop
    select m.user_id into v_heir
      from public.team_members m
     where m.team_id = v_team.id and m.user_id <> v_uid
     order by case m.role when 'leader' then 0 when 'moderator' then 1 else 2 end, m.joined_at
     limit 1;
    if v_heir is null then
      delete from public.teams where id = v_team.id; -- personne d'autre : l'équipe disparaît
    else
      update public.teams set created_by = v_heir where id = v_team.id;
      update public.team_members set role = 'creator' where team_id = v_team.id and user_id = v_heir;
    end if;
  end loop;

  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
