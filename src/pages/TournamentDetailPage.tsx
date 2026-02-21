import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Image,
  Users,
  Settings,
  Award,
  Trophy,
  Calendar,
  Trash2,
  Plus,
  ChevronDown,
  CheckCircle,
  Pencil,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTournamentStore } from "@/store/tournamentStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Match, SeasonRecord, STAGE_TEAM_COUNTS } from "@/types/tournament";
import { generateRoundRobin } from "@/lib/roundRobin";
import { calculateStandings } from "@/lib/standings";
import StandingsTable from "@/components/tournament/StandingsTable";
import GroupStandingsView from "@/components/tournament/GroupStandingsView";
import GroupQualificationView from "@/components/tournament/GroupQualificationView";
import RoundsView from "@/components/tournament/RoundsView";
import BracketView from "@/components/tournament/BracketView";
import StatsView from "@/components/tournament/StatsView";

const formatLabels: Record<string, string> = {
  liga: "Liga",
  grupos: "Grupos + Mata-Mata",
  "mata-mata": "Mata-Mata",
  suico: "Sistema Suíço",
};

function compareRowsForBestOf(
  a: import("@/lib/standings").StandingRow,
  b: import("@/lib/standings").StandingRow
) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId.localeCompare(b.teamId);
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, teams, updateTournament, removeTournament, loading } = useTournamentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [viewingYear, setViewingYear] = useState<number | null>(null);
  const [newSeasonYear, setNewSeasonYear] = useState("");

  const tournament = tournaments.find((t) => t.id === id);

  useEffect(() => {
    if (loading || !tournament) return;
    if (tournament.format !== "grupos") return;

    const settings = tournament.settings;
    const groupCount = tournament.gruposQuantidade || 1;
    const groupMatches = (tournament.matches || []).filter((m) => m.stage === "group" || (!m.stage && m.group !== undefined));
    const knockoutMatches = (tournament.matches || []).filter((m) => m.stage === "knockout" || (!m.stage && m.group === undefined));
    const allGroupMatchesPlayed = groupMatches.length > 0 && groupMatches.every((m) => m.played);

    if (!allGroupMatchesPlayed) return;
    if (tournament.groupsFinalized) return;
    if (knockoutMatches.length > 0) return;
    if ((settings.qualifiedTeamIds?.length || 0) > 0) return;

    const standingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
    for (let g = 1; g <= groupCount; g++) {
      const gMatches = groupMatches.filter((m) => m.group === g);
      const gTeamIds = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      standingsByGroup[g] = calculateStandings(gTeamIds, gMatches, settings, teams);
    }

    const startStage = tournament.gruposMataMataInicio || "1/8";
    const totalKnockoutTeams = STAGE_TEAM_COUNTS[startStage] || 16;
    const directPerGroup = Math.floor(totalKnockoutTeams / groupCount);
    const selected = new Set<string>();

    for (let g = 1; g <= groupCount; g++) {
      const rows = standingsByGroup[g] || [];
      for (let i = 0; i < Math.min(directPerGroup, rows.length); i++) {
        selected.add(rows[i].teamId);
      }
    }

    let remaining = totalKnockoutTeams - selected.size;
    if (remaining > 0) {
      const bestOfPosition = settings.bestOfPosition ?? directPerGroup + 1;
      const bestOfQualifiers = settings.bestOfQualifiers ?? remaining;
      const bestOfCandidates: import("@/lib/standings").StandingRow[] = [];
      for (let g = 1; g <= groupCount; g++) {
        const row = (standingsByGroup[g] || [])[bestOfPosition - 1];
        if (row && !selected.has(row.teamId)) bestOfCandidates.push(row);
      }
      bestOfCandidates.sort(compareRowsForBestOf);
      for (const row of bestOfCandidates.slice(0, Math.min(remaining, bestOfQualifiers))) {
        selected.add(row.teamId);
      }
    }

    remaining = totalKnockoutTeams - selected.size;
    if (remaining > 0) {
      const fallbackCandidates = Object.values(standingsByGroup)
        .flat()
        .filter((row) => !selected.has(row.teamId))
        .sort(compareRowsForBestOf);
      for (const row of fallbackCandidates.slice(0, remaining)) {
        selected.add(row.teamId);
      }
    }

    const selectedTeamIds = Array.from(selected).slice(0, totalKnockoutTeams);
    if (selectedTeamIds.length !== totalKnockoutTeams) return;

    const teamGroupPos: Record<string, { group: number; pos: number }> = {};
    for (let g = 1; g <= groupCount; g++) {
      (standingsByGroup[g] || []).forEach((row, idx) => {
        teamGroupPos[row.teamId] = { group: g, pos: idx };
      });
    }
    const seededFinal = [...selectedTeamIds].sort((a, b) => {
      const posA = teamGroupPos[a]?.pos ?? 99;
      const posB = teamGroupPos[b]?.pos ?? 99;
      if (posA !== posB) return posA - posB;
      return (teamGroupPos[a]?.group ?? 0) - (teamGroupPos[b]?.group ?? 0);
    });

    const legMode = settings.knockoutLegMode || "single";
    const newMatches: Match[] = [];
    for (let i = 0; i < Math.floor(seededFinal.length / 2); i++) {
      const home = seededFinal[i];
      const away = seededFinal[seededFinal.length - 1 - i];
      if (legMode === "home-away") {
        const pairId = crypto.randomUUID();
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 1, pairId });
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: away, awayTeamId: home, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 2, pairId });
      } else {
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout" });
      }
    }

    updateTournament(tournament.id, {
      matches: [...(tournament.matches || []), ...newMatches],
      groupsFinalized: true,
      settings: { ...settings, qualifiedTeamIds: selectedTeamIds },
    });
    toast.success(`Classificação automática concluída: ${selectedTeamIds.length} times no mata-mata.`);
  }, [loading, tournament, teams, updateTournament]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-12 h-12 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-6 lg:p-8 text-center py-20">
        <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Competição não encontrada</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm mt-3 hover:underline">
          Voltar ao início
        </button>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateTournament(tournament.id, { logo: ev.target?.result as string });
      toast.success("Logo atualizado!");
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = () => {
    removeTournament(tournament.id);
    toast.success("Competição excluída");
    navigate("/");
  };

  const hasKnockout = tournament.format === "grupos";
  const isGrupos = tournament.format === "grupos";

  // Determine if viewing a past season
  const activeYear = viewingYear ?? tournament.year;
  const pastSeason = (tournament.seasons || []).find((s) => s.year === activeYear && activeYear !== tournament.year);
  const isViewingPastSeason = !!pastSeason;

  // Convert past season standings to StandingRow[] for display
  const pastStandings: import("@/lib/standings").StandingRow[] = pastSeason
    ? pastSeason.standings.map((s) => ({
        teamId: s.teamId,
        team: teams.find((t) => t.id === s.teamId) || { id: s.teamId, name: s.teamName, shortName: s.teamName, abbreviation: "", logo: s.teamLogo, colors: [], rate: 5 },
        played: s.wins + s.draws + s.losses,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: s.goalsFor - s.goalsAgainst,
        points: s.points,
      }))
    : [];

  const optionIcons = [
    { icon: Pencil, label: "Editar Competição", action: () => navigate(`/tournament/${tournament.id}/edit`) },
    { icon: Image, label: "Alterar Logo", action: () => fileInputRef.current?.click() },
    { icon: Users, label: "Editar Times", action: () => navigate(`/tournament/${tournament.id}/teams`) },
    { icon: Settings, label: "Editar Sistemas", action: () => navigate(`/tournament/${tournament.id}/settings`) },
    { icon: Award, label: "Galeria", action: () => navigate(`/tournament/${tournament.id}/gallery`) },
  ];

  const settings = tournament.settings;

  // For grupos format, separate group and knockout matches
  const groupMatches = isGrupos
    ? (tournament.matches || []).filter((m) => m.stage === "group" || (!m.stage && m.group !== undefined))
    : tournament.matches || [];
  const knockoutMatches = isGrupos
    ? (tournament.matches || []).filter((m) => m.stage === "knockout" || (!m.stage && m.group === undefined))
    : [];

  // For grupos: compute standings per group
  const groupCount = tournament.gruposQuantidade || 1;
  const standingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isGrupos) {
    for (let g = 1; g <= groupCount; g++) {
      const gMatches = groupMatches.filter((m) => m.group === g);
      const gTeamIds = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      standingsByGroup[g] = calculateStandings(gTeamIds, gMatches, settings, teams);
    }
  }

  // Overall standings (for liga format or general use)
  const standings = isGrupos
    ? Object.values(standingsByGroup).flat()
    : calculateStandings(tournament.teamIds, tournament.matches || [], settings, teams);

  // Check if all group matches have been played
  const allGroupMatchesPlayed = isGrupos && groupMatches.length > 0 && groupMatches.every((m) => m.played);
  const canAccessKnockoutTab = tournament.groupsFinalized || allGroupMatchesPlayed || knockoutMatches.length > 0;

  // Create a "group-only" tournament view for RoundsView
  const groupTournament = isGrupos
    ? { ...tournament, matches: groupMatches }
    : tournament;

  // Create a "knockout-only" tournament view for BracketView
  const knockoutTournament = isGrupos
    ? { ...tournament, matches: knockoutMatches, mataMataInicio: tournament.gruposMataMataInicio || "1/8" }
    : tournament;

  // ─── Confirm manual qualifiers & generate knockout ───────────────────────
  const handleConfirmQualifiers = (selectedTeamIds: string[], options?: { auto?: boolean }) => {
    const startStage = tournament.gruposMataMataInicio || "1/8";
    const totalKnockoutTeams = STAGE_TEAM_COUNTS[startStage] || 16;

    if (selectedTeamIds.length !== totalKnockoutTeams) {
      toast.error(`Selecione exatamente ${totalKnockoutTeams} times.`);
      return;
    }

    // Build seeded list: order by group-position for cross-seeding
    const teamGroupPos: Record<string, { group: number; pos: number }> = {};
    for (let g = 1; g <= groupCount; g++) {
      (standingsByGroup[g] || []).forEach((row, idx) => {
        teamGroupPos[row.teamId] = { group: g, pos: idx };
      });
    }
    const seededFinal = [...selectedTeamIds].sort((a, b) => {
      const posA = teamGroupPos[a]?.pos ?? 99;
      const posB = teamGroupPos[b]?.pos ?? 99;
      if (posA !== posB) return posA - posB;
      return (teamGroupPos[a]?.group ?? 0) - (teamGroupPos[b]?.group ?? 0);
    });

    const legMode = settings.knockoutLegMode || "single";
    const newMatches: Match[] = [];

    for (let i = 0; i < Math.floor(seededFinal.length / 2); i++) {
      const home = seededFinal[i];
      const away = seededFinal[seededFinal.length - 1 - i];
      if (legMode === "home-away") {
        const pairId = crypto.randomUUID();
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 1, pairId });
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: away, awayTeamId: home, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 2, pairId });
      } else {
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout" });
      }
    }

    const allMatches = [...(tournament.matches || []), ...newMatches];
    const updatedSettings = { ...settings, qualifiedTeamIds: selectedTeamIds };
    updateTournament(tournament.id, {
      matches: allMatches,
      groupsFinalized: true,
      settings: updatedSettings,
    });
    if (options?.auto) {
      toast.success(`Classificação automática concluída: ${selectedTeamIds.length} times no mata-mata.`);
    } else {
      toast.success(`${selectedTeamIds.length} times classificados! ${newMatches.length} jogos de mata-mata gerados.`);
    }
  };

  const handleFinalizeSeason = () => {
    if (standings.length === 0) return;
    const champion = standings[0];
    const seasonRecord: SeasonRecord = {
      year: tournament.year,
      championId: champion.teamId,
      championName: champion.team?.name || "Desconhecido",
      championLogo: champion.team?.logo,
      format: tournament.format,
      groupCount: isGrupos ? groupCount : undefined,
      standings: standings.map((s) => ({
        teamId: s.teamId,
        teamName: s.team?.name || "",
        teamLogo: s.team?.logo,
        points: s.points,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
      })),
      matches: [...(tournament.matches || [])],
    };
    const existingSeasons = (tournament.seasons || []).filter((s) => s.year !== tournament.year);
    updateTournament(tournament.id, {
      finalized: true,
      seasons: [...existingSeasons, seasonRecord],
    });
    toast.success(`Temporada ${tournament.year} finalizada! ${champion.team?.name} é o campeão!`);
  };

  const handleNewSeason = () => {
    updateTournament(tournament.id, {
      year: tournament.year + 1,
      matches: [],
      finalized: false,
      groupsFinalized: false,
    });
    navigate(`/tournament/${tournament.id}/settings`);
    toast.success(`Nova temporada ${tournament.year + 1} criada! Edite as configurações.`);
  };

  const handleDeleteSeason = (year: number) => {
    const updatedSeasons = (tournament.seasons || []).filter((s) => s.year !== year);
    if (year === tournament.year) {
      updateTournament(tournament.id, {
        matches: [],
        finalized: false,
        groupsFinalized: false,
        seasons: updatedSeasons,
      });
    } else {
      updateTournament(tournament.id, { seasons: updatedSeasons });
    }
    if (viewingYear === year) setViewingYear(null);
    toast.success(`Temporada ${year} excluída`);
  };

  const handleCreateSeason = (yearValue?: number) => {
    const targetYear = yearValue || (newSeasonYear ? parseInt(newSeasonYear) : null);
    if (!targetYear || isNaN(targetYear)) {
      toast.error("Informe um ano válido");
      return;
    }
    const existingYears = new Set([
      ...(tournament.seasons || []).map((s) => s.year),
      tournament.year,
    ]);
    if (existingYears.has(targetYear)) {
      toast.error("Já existe uma temporada para este ano");
      return;
    }
    const newSeason: SeasonRecord = {
      year: targetYear,
      championId: "",
      championName: "A definir",
      standings: [],
      matches: [],
    };
    updateTournament(tournament.id, {
      year: targetYear,
      seasons: [...(tournament.seasons || []), newSeason],
      matches: [],
      finalized: false,
      groupsFinalized: false,
    });
    setNewSeasonYear("");
    toast.success(`Temporada ${targetYear} criada`);
  };

  // Auto-generate matches on first load if none exist
  const autoGenerate = () => {
    if (tournament.matches.length > 0 || tournament.teamIds.length < 2) return;
    
    if (tournament.format === "liga") {
      const turnos = tournament.ligaTurnos || 1;
      const matches = generateRoundRobin(tournament.id, tournament.teamIds, turnos);
      updateTournament(tournament.id, { matches });
      toast.success(`${matches.length} jogos gerados automaticamente!`);
    } else if (tournament.format === "grupos") {
      const turnos = tournament.gruposTurnos || 1;
      const teamIds = [...tournament.teamIds];
      // Pot-based distribution using rates
      const sortedTeamIds = [...teamIds].sort((a, b) => {
        const teamA = teams.find((t) => t.id === a);
        const teamB = teams.find((t) => t.id === b);
        return (teamB?.rate || 5) - (teamA?.rate || 5);
      });
      const teamsPerGroup = Math.ceil(sortedTeamIds.length / groupCount);
      // Snake draft to distribute by pots
      const groups: string[][] = Array.from({ length: groupCount }, () => []);
      let potIndex = 0;
      for (let i = 0; i < sortedTeamIds.length; i++) {
        const pot = Math.floor(i / groupCount);
        let groupIdx: number;
        if (pot % 2 === 0) {
          groupIdx = i % groupCount;
        } else {
          groupIdx = groupCount - 1 - (i % groupCount);
        }
        groups[groupIdx].push(sortedTeamIds[i]);
      }
      
      const allMatches: Match[] = [];
      for (let g = 0; g < groupCount; g++) {
        if (groups[g].length < 2) continue;
        const groupMatches = generateRoundRobin(tournament.id, groups[g], turnos as 1 | 2 | 3 | 4);
        const tagged = groupMatches.map((m) => ({
          ...m,
          group: g + 1,
          stage: "group" as const,
        }));
        allMatches.push(...tagged);
      }
      updateTournament(tournament.id, { matches: allMatches });
      toast.success(`${allMatches.length} jogos de fase de grupos gerados!`);
    } else if (tournament.format === "mata-mata") {
      const teamIds = [...tournament.teamIds];
      // Validate power-of-2 count
      const startStage = tournament.mataMataInicio || "1/8";
      const expectedTeams = STAGE_TEAM_COUNTS[startStage] || 16;
      if (teamIds.length !== expectedTeams) {
        toast.error(`A fase ${startStage} exige exatamente ${expectedTeams} times. Você tem ${teamIds.length}.`);
        return;
      }
      // Shuffle
      for (let i = teamIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
      }
      const legMode = tournament.settings.knockoutLegMode || "single";
      const newMatches: Match[] = [];
      for (let i = 0; i < teamIds.length; i += 2) {
        if (i + 1 < teamIds.length) {
          if (legMode === "home-away") {
            const pairId = crypto.randomUUID();
            newMatches.push({
              id: crypto.randomUUID(),
              tournamentId: tournament.id,
              round: 1,
              homeTeamId: teamIds[i],
              awayTeamId: teamIds[i + 1],
              homeScore: 0,
              awayScore: 0,
              played: false,
              leg: 1,
              pairId,
            });
            newMatches.push({
              id: crypto.randomUUID(),
              tournamentId: tournament.id,
              round: 1,
              homeTeamId: teamIds[i + 1],
              awayTeamId: teamIds[i],
              homeScore: 0,
              awayScore: 0,
              played: false,
              leg: 2,
              pairId,
            });
          } else {
            newMatches.push({
              id: crypto.randomUUID(),
              tournamentId: tournament.id,
              round: 1,
              homeTeamId: teamIds[i],
              awayTeamId: teamIds[i + 1],
              homeScore: 0,
              awayScore: 0,
              played: false,
            });
          }
        }
      }
      updateTournament(tournament.id, { matches: newMatches });
      toast.success(`${newMatches.length} jogos gerados!`);
    }
  };

  // Determine past season format for proper visualization
  const pastSeasonFormat = pastSeason?.format || tournament.format;

  // Build past season group standings if needed
  const pastGroupCount = pastSeason?.groupCount || tournament.gruposQuantidade || 1;
  const pastStandingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isViewingPastSeason && pastSeasonFormat === "grupos" && pastSeason?.matches) {
    const pastGroupMatches = pastSeason.matches.filter((m) => m.stage === "group" || !m.stage);
    for (let g = 1; g <= pastGroupCount; g++) {
      const gMatches = pastGroupMatches.filter((m) => m.group === g);
      const gTeamIds = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      pastStandingsByGroup[g] = calculateStandings(gTeamIds, gMatches, settings, teams);
    }
  }

  const pastKnockoutMatches = isViewingPastSeason && pastSeason?.matches
    ? pastSeason.matches.filter((m) => m.stage === "knockout")
    : [];

  return (
    <div className="p-6 lg:p-8">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 flex items-center justify-center cursor-pointer transition-colors overflow-hidden"
            >
              {tournament.logo ? (
                <img src={tournament.logo} alt="" className="w-12 h-12 object-contain" />
              ) : (
                <Trophy className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold text-foreground">{tournament.name}</h1>
                <div className="flex items-center gap-1">
                  {optionIcons.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      title={item.label}
                      className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <item.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {tournament.sport} · {formatLabels[tournament.format]} · {tournament.numberOfTeams} times
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Season/Year selector */}
          <div className="relative">
            <button
              onClick={() => setShowYearPicker(!showYearPicker)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm font-display font-bold text-foreground hover:border-primary/40 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {activeYear}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showYearPicker && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 p-2 min-w-[220px]">
                {(() => {
                  const seasonYears = (tournament.seasons || []).map((s) => s.year);
                  const allYears = Array.from(new Set([...seasonYears, tournament.year])).sort((a, b) => b - a);
                  return (
                    <>
                      {allYears.map((year) => (
                        <div key={year} className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setViewingYear(year === tournament.year ? null : year);
                              setShowYearPicker(false);
                            }}
                            className={`flex-1 text-left px-3 py-1.5 rounded text-sm transition-colors ${
                              year === activeYear
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-foreground hover:bg-secondary"
                            }`}
                          >
                            {year}
                            {seasonYears.includes(year) && year !== tournament.year && (
                              <span className="text-xs text-muted-foreground ml-1">✓</span>
                            )}
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                title="Excluir temporada"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir temporada {year}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Todos os dados desta temporada serão perdidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => { handleDeleteSeason(year); setShowYearPicker(false); }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                      <div className="border-t border-border mt-1 pt-1 space-y-1">
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            placeholder="Ano"
                            value={newSeasonYear}
                            onChange={(e) => setNewSeasonYear(e.target.value)}
                            className="h-7 text-xs bg-secondary border-border flex-1"
                            min={1900}
                            max={2200}
                          />
                          <button
                            onClick={() => handleCreateSeason()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Criar
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir "{tournament.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os dados da competição serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* New Season Banner */}
      {!isViewingPastSeason && tournament.finalized && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Temporada {tournament.year} finalizada
            </span>
          </div>
          <Button onClick={handleNewSeason} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" />
            Nova Temporada {tournament.year + 1}
          </Button>
        </motion.div>
      )}

      {isViewingPastSeason ? (
        <div>
          {/* Past season champion banner */}
          {pastSeason!.championId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Trophy className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Campeão {pastSeason!.year}: <span className="text-primary font-bold">{pastSeason!.championName}</span>
                </p>
              </div>
              {pastSeason!.championLogo && (
                <img src={pastSeason!.championLogo} alt="" className="w-8 h-8 object-contain ml-auto" />
              )}
            </motion.div>
          )}

          {/* Past season: show bracket for mata-mata format */}
          {pastSeasonFormat === "mata-mata" && (pastSeason!.matches || []).length > 0 ? (
            <Tabs defaultValue="chaveamento" className="w-full">
              <TabsList className="bg-secondary border border-border mb-6 w-full justify-start gap-1 h-auto p-1 flex-wrap">
                <TabsTrigger value="chaveamento" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                  Chaveamento
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chaveamento">
                <div className="rounded-xl card-gradient border border-border shadow-card p-4">
                  <BracketView
                    tournament={{
                      ...tournament,
                      matches: pastSeason!.matches || [],
                    }}
                    teams={teams}
                    onUpdateMatch={() => {}}
                    onBatchUpdateMatches={() => {}}
                    onGenerateBracket={() => {}}
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : pastSeasonFormat === "grupos" && (pastSeason!.matches || []).length > 0 ? (
            /* Past season grupos: show group tables + knockout bracket */
            <Tabs defaultValue="grupos" className="w-full">
              <TabsList className="bg-secondary border border-border mb-6 w-full justify-start gap-1 h-auto p-1 flex-wrap">
                <TabsTrigger value="grupos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                  Grupos
                </TabsTrigger>
                {pastKnockoutMatches.length > 0 && (
                  <TabsTrigger value="chaveamento" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                    Chaveamento
                  </TabsTrigger>
                )}
                <TabsTrigger value="rodadas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                  Rodadas
                </TabsTrigger>
              </TabsList>
              <TabsContent value="grupos">
                <div className="rounded-xl card-gradient border border-border shadow-card p-4">
                  <GroupStandingsView
                    groupCount={pastGroupCount}
                    standingsByGroup={pastStandingsByGroup}
                    
                  />
                </div>
              </TabsContent>
              {pastKnockoutMatches.length > 0 && (
                <TabsContent value="chaveamento">
                  <div className="rounded-xl card-gradient border border-border shadow-card p-4">
                    <BracketView
                      tournament={{
                        ...tournament,
                        matches: pastKnockoutMatches,
                        mataMataInicio: tournament.gruposMataMataInicio || "1/8",
                      }}
                      teams={teams}
                      onUpdateMatch={() => {}}
                      onBatchUpdateMatches={() => {}}
                      onGenerateBracket={() => {}}
                    />
                  </div>
                </TabsContent>
              )}
              <TabsContent value="rodadas">
                <div className="rounded-xl card-gradient border border-border shadow-card p-4">
                  <RoundsView
                    tournament={{
                      ...tournament,
                      matches: (pastSeason!.matches || []).filter((m) => m.stage === "group" || !m.stage),
                    }}
                    teams={teams}
                    onUpdateMatch={() => {}}
                    onBatchUpdateMatches={() => {}}
                    onGenerateRounds={() => {}}
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Past season: default tabela + rodadas view (liga) */
            <Tabs defaultValue="tabela" className="w-full">
              <TabsList className="bg-secondary border border-border mb-6 w-full justify-start gap-1 h-auto p-1 flex-wrap">
                <TabsTrigger value="tabela" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                  Classificação
                </TabsTrigger>
                {(pastSeason!.matches || []).length > 0 && (
                  <TabsTrigger value="rodadas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                    Rodadas
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="tabela">
                <div className="rounded-xl card-gradient border border-border shadow-card p-4">
                  <h3 className="text-sm font-display font-bold text-foreground mb-3">
                    Classificação Final — {pastSeason!.year}
                  </h3>
                  <StandingsTable
                    standings={pastStandings}
                    promotions={tournament.settings.promotions}
                  />
                </div>
              </TabsContent>

              {(pastSeason!.matches || []).length > 0 && (
                <TabsContent value="rodadas">
                  <div className="rounded-xl card-gradient border border-border shadow-card p-4">
                    <RoundsView
                      tournament={{
                        ...tournament,
                        matches: pastSeason!.matches || [],
                      }}
                      teams={teams}
                      onUpdateMatch={() => {}}
                      onBatchUpdateMatches={() => {}}
                      onGenerateRounds={() => {}}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      ) : tournament.format === "mata-mata" ? (
        <Tabs defaultValue="mata-mata" className="w-full">
          <TabsList className="bg-secondary border border-border mb-6 w-full justify-start gap-1 h-auto p-1 flex-wrap">
            <TabsTrigger value="mata-mata" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Mata-Mata
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mata-mata">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <BracketView
                tournament={tournament}
                teams={teams}
                onUpdateMatch={(updated: Match) => {
                  const newMatches = (tournament.matches || []).map((m) =>
                    m.id === updated.id ? updated : m
                  );
                  updateTournament(tournament.id, { matches: newMatches });
                  toast.success("Resultado registrado!");
                }}
                onBatchUpdateMatches={(updatedMatches: Match[]) => {
                  const existingIds = new Set((tournament.matches || []).map((m) => m.id));
                  const updates = updatedMatches.filter((m) => existingIds.has(m.id));
                  const additions = updatedMatches.filter((m) => !existingIds.has(m.id));
                  const newMatches = [
                    ...(tournament.matches || []).map((m) => {
                      const upd = updates.find((u) => u.id === m.id);
                      return upd || m;
                    }),
                    ...additions,
                  ];
                  updateTournament(tournament.id, { matches: newMatches });
                  toast.success("Chaveamento atualizado!");
                }}
                onGenerateBracket={() => {
                  autoGenerate();
                }}
                onFinalize={handleFinalizeSeason}
              />
            </div>
          </TabsContent>

          <TabsContent value="estatisticas">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <StatsView tournament={tournament} teams={teams} />
            </div>
          </TabsContent>
        </Tabs>
      ) : isGrupos ? (
        /* GRUPOS + MATA-MATA format */
        <Tabs defaultValue="tabela" className="w-full">
          <TabsList className="bg-secondary border border-border mb-6 w-full justify-start gap-1 h-auto p-1 flex-wrap">
            <TabsTrigger value="tabela" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Grupos
            </TabsTrigger>
            <TabsTrigger value="rodadas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Rodadas
            </TabsTrigger>
            {canAccessKnockoutTab && (
              <TabsTrigger value="mata-mata" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                Mata-Mata
              </TabsTrigger>
            )}
            <TabsTrigger value="estatisticas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tabela">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <GroupQualificationView
                groupCount={groupCount}
                standingsByGroup={standingsByGroup}
                totalKnockoutTeams={(() => {
                  return STAGE_TEAM_COUNTS[tournament.gruposMataMataInicio || "1/8"] || 16;
                })()}
                allGroupMatchesPlayed={allGroupMatchesPlayed}
                confirmedTeamIds={tournament.settings.qualifiedTeamIds}
                onConfirm={handleConfirmQualifiers}
              />
            </div>
          </TabsContent>

          <TabsContent value="rodadas">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <RoundsView
                tournament={groupTournament}
                teams={teams}
                onUpdateMatch={(updated: Match) => {
                  const newMatches = (tournament.matches || []).map((m) =>
                    m.id === updated.id ? updated : m
                  );
                  updateTournament(tournament.id, { matches: newMatches });
                  toast.success("Resultado registrado!");
                }}
                onBatchUpdateMatches={(updatedMatches: Match[]) => {
                  const ids = new Set(updatedMatches.map((u) => u.id));
                  const newMatches = (tournament.matches || []).map((m) =>
                    ids.has(m.id) ? updatedMatches.find((u) => u.id === m.id)! : m
                  );
                  updateTournament(tournament.id, { matches: newMatches });
                  toast.success(`${updatedMatches.length} jogos simulados!`);
                }}
                onGenerateRounds={() => {
                  autoGenerate();
                }}
              />
            </div>
          </TabsContent>

          {canAccessKnockoutTab && (
            <TabsContent value="mata-mata">
              <div className="rounded-xl card-gradient border border-border shadow-card p-4">
                {tournament.groupsFinalized ? (
                  <BracketView
                    tournament={knockoutTournament}
                    teams={teams}
                    onUpdateMatch={(updated: Match) => {
                      const updatedWithStage = { ...updated, stage: "knockout" as const };
                      const newMatches = (tournament.matches || []).map((m) =>
                        m.id === updatedWithStage.id ? updatedWithStage : m
                      );
                      updateTournament(tournament.id, { matches: newMatches });
                      toast.success("Resultado registrado!");
                    }}
                    onBatchUpdateMatches={(updatedMatches: Match[]) => {
                      const tagged = updatedMatches.map((m) => ({ ...m, stage: "knockout" as const }));
                      const existingIds = new Set((tournament.matches || []).map((m) => m.id));
                      const updates = tagged.filter((m) => existingIds.has(m.id));
                      const additions = tagged.filter((m) => !existingIds.has(m.id));
                      const newMatches = [
                        ...(tournament.matches || []).map((m) => {
                          const upd = updates.find((u) => u.id === m.id);
                          return upd || m;
                        }),
                        ...additions,
                      ];
                      updateTournament(tournament.id, { matches: newMatches });
                      toast.success("Chaveamento atualizado!");
                    }}
                    onGenerateBracket={() => {}}
                    onFinalize={handleFinalizeSeason}
                  />
                ) : (
                  <GroupQualificationView
                    groupCount={groupCount}
                    standingsByGroup={standingsByGroup}
                    totalKnockoutTeams={(() => {
                      return STAGE_TEAM_COUNTS[tournament.gruposMataMataInicio || "1/8"] || 16;
                    })()}
                    allGroupMatchesPlayed={allGroupMatchesPlayed}
                    confirmedTeamIds={tournament.settings.qualifiedTeamIds}
                    onConfirm={handleConfirmQualifiers}
                  />
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="estatisticas">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <StatsView tournament={tournament} teams={teams} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* LIGA format */
        <Tabs defaultValue="tabela" className="w-full">
          <TabsList className="bg-secondary border border-border mb-6 w-full justify-start gap-1 h-auto p-1 flex-wrap">
            <TabsTrigger value="tabela" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Tabela
            </TabsTrigger>
            <TabsTrigger value="rodadas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Rodadas
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tabela">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <StandingsTable
                standings={standings}
                promotions={tournament.settings.promotions}
              />
            </div>
          </TabsContent>

          <TabsContent value="rodadas">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <RoundsView
                tournament={tournament}
                teams={teams}
                onUpdateMatch={(updated: Match) => {
                  const newMatches = (tournament.matches || []).map((m) =>
                    m.id === updated.id ? updated : m
                  );
                  updateTournament(tournament.id, { matches: newMatches });
                  toast.success("Resultado registrado!");
                }}
                onBatchUpdateMatches={(updatedMatches: Match[]) => {
                  const ids = new Set(updatedMatches.map((u) => u.id));
                  const newMatches = (tournament.matches || []).map((m) =>
                    ids.has(m.id) ? updatedMatches.find((u) => u.id === m.id)! : m
                  );
                  updateTournament(tournament.id, { matches: newMatches });
                  toast.success(`${updatedMatches.length} jogos simulados!`);
                }}
                onGenerateRounds={() => {
                  autoGenerate();
                }}
                onFinalize={handleFinalizeSeason}
              />
            </div>
          </TabsContent>

          <TabsContent value="estatisticas">
            <div className="rounded-xl card-gradient border border-border shadow-card p-4">
              <StatsView tournament={tournament} teams={teams} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
