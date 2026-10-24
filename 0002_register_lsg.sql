-- À exécuter UNIQUEMENT après avoir installé le texte Louis Segond 1910 (public/bibles/lsg).
-- Une seule commande : compatible avec l'éditeur SQL (désactiver « Lecture seule »).
with lic as (
  insert into public.content_licenses (translation_name, publisher, license_terms, allow_reproduction, allow_offline_download, allow_audio, attribution)
  values ('Louis Segond 1910', 'eBible.org', 'Domaine public (indiqué par eBible.org, fiche fraLSG)', true, true, false, 'Louis Segond 1910, domaine public. Source : eBible.org')
  returning id
)
insert into public.bible_versions (id, language, name, license_id, is_test_data)
select 'lsg', 'fr', 'Louis Segond 1910', lic.id, false from lic;
