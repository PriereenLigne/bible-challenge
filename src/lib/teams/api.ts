import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateTeamParams } from "./build";
import type { MemberProgress } from "./stats";

export interface TeamRow { id: string; name: string; description: string | null; scope: string | null; book_ids: string[] | null; start_date: string | null; end_date: string | null; created_by: string }
export interface InviteRow { code: string; expires_at: string; revoked_at: string | null; max_uses: number | null; uses: number }

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message); // messages métier en français renvoyés par les fonctions SQL
  return r.data as T;
}

export async function listMyTeams(sb: SupabaseClient): Promise<TeamRow[]> {
  return ok<TeamRow[]>(await sb.from("teams").select("id,name,description,scope,book_ids,start_date,end_date,created_by").order("created_at", { ascending: false })) ?? [];
}
export const createTeam = async (sb: SupabaseClient, p: CreateTeamParams) => ok<string>(await sb.rpc("create_team", p));
export const joinByCode = async (sb: SupabaseClient, code: string) => ok<string>(await sb.rpc("join_team_by_code", { p_code: code }));
export const getTeamProgress = async (sb: SupabaseClient, team: string) => ok<MemberProgress[]>(await sb.rpc("team_progress", { p_team: team })) ?? [];
export const createInvite = async (sb: SupabaseClient, team: string, days: number, maxUses: number | null) => ok<string>(await sb.rpc("create_team_invite", { p_team: team, p_days: days, p_max_uses: maxUses }));
export async function listInvites(sb: SupabaseClient, team: string): Promise<InviteRow[]> {
  return ok<InviteRow[]>(await sb.from("team_invites").select("code,expires_at,revoked_at,max_uses,uses").eq("team_id", team).order("created_at", { ascending: false })) ?? [];
}
export const revokeInvite = async (sb: SupabaseClient, code: string) => { ok(await sb.rpc("revoke_team_invite", { p_code: code })); };
export const leaveTeam = async (sb: SupabaseClient, team: string) => { ok(await sb.rpc("leave_team", { p_team: team })); };
export const setSharing = async (sb: SupabaseClient, team: string, share: boolean) => { ok(await sb.rpc("set_team_sharing", { p_team: team, p_share: share })); };
