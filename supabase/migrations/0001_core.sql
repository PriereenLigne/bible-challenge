-- BIBLE CHALLENGE — migration 0001 (NON TESTÉE sur une base réelle : à appliquer d'abord sur un projet de développement)

-- Profils : 1 ligne par utilisateur Supabase Auth
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  timezone text not null default 'Africa/Porto-Novo',
  progress_visibility text not null default 'private' check (progress_visibility in ('private','team','public')),
  created_at timestamptz not null default now()
);

-- Registre des licences : aucun texte biblique sans ligne ici
create table public.content_licenses (
  id uuid primary key default gen_random_uuid(),
  translation_name text not null,
  publisher text not null,
  license_terms text not null,
  allow_reproduction boolean not null default false,
  allow_offline_download boolean not null default false,
  allow_audio boolean not null default false,
  attribution text,
  created_at timestamptz not null default now()
);
create table public.bible_versions (
  id text primary key,
  language text not null,
  name text not null,
  license_id uuid not null references public.content_licenses(id),
  is_test_data boolean not null default false
);

-- Défis (personnels pour l'instant ; équipes en phase 5)
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  scope text not null,                    -- ex. 'full', 'nt', 'gospels'
  book_ids text[] not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft','planned','active','paused','completed','abandoned')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index on public.challenges(owner_id);

-- Événements de lecture : source de vérité. Unicité = pas de double comptage.
create table public.reading_events (
  id uuid primary key default gen_random_uuid(),
  op_id uuid not null unique,             -- idempotence des opérations hors ligne
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  book_id text not null,
  chapter int not null check (chapter >= 1),
  read_on date not null,
  received_at timestamptz not null default now(),
  unique (user_id, challenge_id, book_id, chapter)
);
create index on public.reading_events(challenge_id, user_id);

-- Notes privées, versionnées
create table public.notes (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);
create table public.note_conflicts (      -- aucune perte de contenu en cas de conflit
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  base_version int not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.reading_events enable row level security;
alter table public.notes enable row level security;
alter table public.note_conflicts enable row level security;
alter table public.content_licenses enable row level security;
alter table public.bible_versions enable row level security;

create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy challenges_owner on public.challenges for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Lecture seule côté client : toute écriture passe par apply_reading_events()
create policy reading_events_read_own on public.reading_events for select using (user_id = auth.uid());
create policy notes_owner on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy note_conflicts_read_own on public.note_conflicts for select using (user_id = auth.uid());
create policy licenses_read on public.content_licenses for select using (auth.role() = 'authenticated');
create policy versions_read on public.bible_versions for select using (auth.role() = 'authenticated');

-- Application idempotente d'un lot de lectures. SECURITY INVOKER : la RLS et auth.uid() s'appliquent.
-- Entrée : [{"op_id","challenge_id","book","chapter","read_on"}]. Sortie : {op_id: "applied"|"duplicate"|"rejected"}
create or replace function public.apply_reading_events(ops jsonb)
returns jsonb language plpgsql security invoker as $$
declare o jsonb; res jsonb := '{}'; n int;
begin
  if auth.uid() is null then raise exception 'non authentifié'; end if;
  for o in select * from jsonb_array_elements(ops) loop
    if not exists (select 1 from public.challenges c where c.id = (o->>'challenge_id')::uuid and c.owner_id = auth.uid()) then
      res := res || jsonb_build_object(o->>'op_id', 'rejected'); continue;
    end if;
    insert into public.reading_events(op_id, user_id, challenge_id, book_id, chapter, read_on)
    values ((o->>'op_id')::uuid, auth.uid(), (o->>'challenge_id')::uuid, o->>'book', (o->>'chapter')::int, (o->>'read_on')::date)
    on conflict do nothing;
    get diagnostics n = row_count;
    res := res || jsonb_build_object(o->>'op_id', case when n = 1 then 'applied' else 'duplicate' end);
  end loop;
  return res;
end $$;
revoke all on function public.apply_reading_events(jsonb) from public, anon;
grant execute on function public.apply_reading_events(jsonb) to authenticated;
