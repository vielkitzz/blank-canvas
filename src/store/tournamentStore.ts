import { useState, useCallback, useEffect } from "react";
import { Tournament, Team, TeamFolder, TournamentSettings, Match, SeasonRecord } from "@/types/tournament";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Json } from "@/integrations/supabase/types";

// Use any-typed client to avoid strict type errors from generated types
const db = supabase as any;

function dbToTournament(row: any): Tournament {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    year: parseInt(String(row.year)) || new Date().getFullYear(),
    format: row.format as Tournament["format"],
    numberOfTeams: parseInt(String(row.number_of_teams)) || 0,
    logo: row.logo || row.logo_url || undefined,
    teamIds: row.team_ids || [],
    settings: row.settings as unknown as TournamentSettings,
    matches: (row.matches || []) as unknown as Match[],
    finalized: row.finalized === true || row.finalized === "true",
    groupsFinalized: row.groups_finalized === true || row.groups_finalized === "true",
    seasons: (row.seasons || []) as unknown as SeasonRecord[],
    ligaTurnos: row.liga_turnos as Tournament["ligaTurnos"],
    gruposQuantidade: row.grupos_quantidade || undefined,
    gruposTurnos: row.grupos_turnos as Tournament["gruposTurnos"],
    gruposMataMataInicio: row.grupos_mata_mata_inicio as Tournament["gruposMataMataInicio"],
    mataMataInicio: row.mata_mata_inicio as Tournament["mataMataInicio"],
    suicoJogosLiga: row.suico_jogos_liga || undefined,
    suicoMataMataInicio: row.suico_mata_mata_inicio as Tournament["suicoMataMataInicio"],
    suicoPlayoffVagas: row.suico_playoff_vagas || undefined,
  };
}

function parseColors(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
  }
  return ["#333333", "#cccccc"];
}

function dbToTeam(row: any): Team {
  return {
    id: row.id ?? "",
    name: row.name ?? "",
    shortName: row.short_name ?? "",
    abbreviation: row.abbreviation ?? "",
    logo: row.logo || row.logo_url || undefined,
    foundingYear: row.founding_year || undefined,
    colors: parseColors(row.colors),
    rate: row.rate ?? 0,
    folderId: row.folder_id || null,
  };
}

export function useTournamentStore() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [folders, setFolders] = useState<TeamFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTournaments([]);
      setTeams([]);
      setFolders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      db.from("tournaments").select("*").eq("user_id", user.id),
      db.from("teams").select("*").eq("user_id", user.id),
      db.from("team_folders").select("*").eq("user_id", user.id),
    ]).then(([tRes, teRes, fRes]: any[]) => {
      if (tRes.data) setTournaments(tRes.data.map(dbToTournament));
      if (teRes.data) setTeams(teRes.data.map(dbToTeam));
      if (fRes.data) setFolders(fRes.data.map((f: any) => ({ id: f.id, name: f.name, parentId: f.parent_id || null })));
      setLoading(false);
    });
  }, [user]);

  const addTournament = useCallback(async (tournament: Tournament) => {
    if (!user) return;
    const { data } = await db.from("tournaments").insert({
      id: tournament.id,
      user_id: user.id,
      name: tournament.name,
      sport: tournament.sport,
      year: tournament.year,
      format: tournament.format,
      number_of_teams: tournament.numberOfTeams,
      logo: tournament.logo || null,
      team_ids: tournament.teamIds,
      settings: tournament.settings as unknown as Json,
      matches: tournament.matches as unknown as Json,
      finalized: tournament.finalized || false,
      groups_finalized: tournament.groupsFinalized || false,
      seasons: (tournament.seasons || []) as unknown as Json,
      liga_turnos: tournament.ligaTurnos || null,
      grupos_quantidade: tournament.gruposQuantidade || null,
      grupos_turnos: tournament.gruposTurnos || null,
      grupos_mata_mata_inicio: tournament.gruposMataMataInicio || null,
      mata_mata_inicio: tournament.mataMataInicio || null,
      suico_jogos_liga: (tournament as any).suicoJogosLiga || null,
      suico_mata_mata_inicio: (tournament as any).suicoMataMataInicio || null,
      suico_playoff_vagas: (tournament as any).suicoPlayoffVagas || null,
    }).select().single();
    if (data) setTournaments((prev) => [...prev, dbToTournament(data)]);
  }, [user]);

  const updateTournament = useCallback(async (id: string, updates: Partial<Tournament>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.sport !== undefined) dbUpdates.sport = updates.sport;
    if (updates.year !== undefined) dbUpdates.year = updates.year;
    if (updates.format !== undefined) dbUpdates.format = updates.format;
    if (updates.numberOfTeams !== undefined) dbUpdates.number_of_teams = updates.numberOfTeams;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
    if (updates.teamIds !== undefined) dbUpdates.team_ids = updates.teamIds;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings as unknown as Json;
    if (updates.matches !== undefined) dbUpdates.matches = updates.matches as unknown as Json;
    if (updates.finalized !== undefined) dbUpdates.finalized = updates.finalized;
    if (updates.groupsFinalized !== undefined) dbUpdates.groups_finalized = updates.groupsFinalized;
    if (updates.seasons !== undefined) dbUpdates.seasons = updates.seasons as unknown as Json;
    if (updates.ligaTurnos !== undefined) dbUpdates.liga_turnos = updates.ligaTurnos;
    if (updates.gruposQuantidade !== undefined) dbUpdates.grupos_quantidade = updates.gruposQuantidade;
    if (updates.gruposTurnos !== undefined) dbUpdates.grupos_turnos = updates.gruposTurnos;
    if (updates.gruposMataMataInicio !== undefined) dbUpdates.grupos_mata_mata_inicio = updates.gruposMataMataInicio;
    if (updates.mataMataInicio !== undefined) dbUpdates.mata_mata_inicio = updates.mataMataInicio;
    if ((updates as any).suicoJogosLiga !== undefined) dbUpdates.suico_jogos_liga = (updates as any).suicoJogosLiga;
    if ((updates as any).suicoMataMataInicio !== undefined) dbUpdates.suico_mata_mata_inicio = (updates as any).suicoMataMataInicio;
    if ((updates as any).suicoPlayoffVagas !== undefined) dbUpdates.suico_playoff_vagas = (updates as any).suicoPlayoffVagas;

    // Optimistic update
    setTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await db.from("tournaments").update(dbUpdates).eq("id", id).eq("user_id", user.id);
  }, [user]);

  const removeTournament = useCallback(async (id: string) => {
    if (!user) return;
    setTournaments((prev) => prev.filter((t) => t.id !== id));
    await db.from("tournaments").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  const addTeam = useCallback(async (team: Team) => {
    if (!user) return;
    const { data } = await db.from("teams").insert({
      id: team.id,
      user_id: user.id,
      name: team.name,
      short_name: team.shortName,
      abbreviation: team.abbreviation,
      logo: team.logo || null,
      founding_year: team.foundingYear || null,
      colors: team.colors,
      rate: team.rate,
      folder_id: team.folderId || null,
    }).select().single();
    if (data) setTeams((prev) => [...prev, dbToTeam(data)]);
  }, [user]);

  const updateTeam = useCallback(async (id: string, updates: Partial<Team>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.shortName !== undefined) dbUpdates.short_name = updates.shortName;
    if (updates.abbreviation !== undefined) dbUpdates.abbreviation = updates.abbreviation;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
    if (updates.foundingYear !== undefined) dbUpdates.founding_year = updates.foundingYear;
    if (updates.colors !== undefined) dbUpdates.colors = updates.colors;
    if (updates.rate !== undefined) dbUpdates.rate = updates.rate;
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;

    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await db.from("teams").update(dbUpdates).eq("id", id).eq("user_id", user.id);
  }, [user]);

  const removeTeam = useCallback(async (id: string) => {
    if (!user) return;
    setTeams((prev) => prev.filter((t) => t.id !== id));
    await db.from("teams").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  const addFolder = useCallback(async (name: string) => {
    if (!user) return;
    const { data } = await db.from("team_folders").insert({
      user_id: user.id,
      name,
    }).select().single();
    if (data) setFolders((prev) => [...prev, { id: data.id, name: data.name, parentId: data.parent_id || null }]);
    return data?.id;
  }, [user]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    if (!user) return;
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    await db.from("team_folders").update({ name }).eq("id", id).eq("user_id", user.id);
  }, [user]);

  const removeFolder = useCallback(async (id: string) => {
    if (!user) return;
    setTeams((prev) => prev.map((t) => (t.folderId === id ? { ...t, folderId: null } : t)));
    setFolders((prev) => prev.filter((f) => f.id !== id));
    await db.from("teams").update({ folder_id: null }).eq("folder_id", id).eq("user_id", user.id);
    await db.from("team_folders").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  const moveTeamToFolder = useCallback(async (teamId: string, folderId: string | null) => {
    if (!user) return;
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, folderId } : t)));
    await db.from("teams").update({ folder_id: folderId }).eq("id", teamId).eq("user_id", user.id);
  }, [user]);

  const moveFolderToFolder = useCallback(async (folderId: string, parentId: string | null) => {
    if (!user) return;
    // Prevent circular references
    if (parentId === folderId) return;
    // Check that parentId is not a descendant of folderId
    let current = parentId;
    while (current) {
      if (current === folderId) return;
      const parent = folders.find((f) => f.id === current);
      current = parent?.parentId || null;
    }
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, parentId } : f)));
    await db.from("team_folders").update({ parent_id: parentId }).eq("id", folderId).eq("user_id", user.id);
  }, [user, folders]);

  return {
    tournaments,
    teams,
    folders,
    loading,
    addTournament,
    updateTournament,
    removeTournament,
    addTeam,
    updateTeam,
    removeTeam,
    addFolder,
    renameFolder,
    removeFolder,
    moveTeamToFolder,
    moveFolderToFolder,
  };
}
