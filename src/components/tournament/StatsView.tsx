import { Match, Team, Tournament } from "@/types/tournament";
import { Shield, Swords, ShieldCheck } from "lucide-react";

interface StatsViewProps {
  tournament: Tournament;
  teams: Team[];
}

interface TeamStats {
  teamId: string;
  team?: Team;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  avgFor: number;
  avgAgainst: number;
}

function computeStats(tournament: Tournament, teams: Team[]): TeamStats[] {
  const map = new Map<string, TeamStats>();

  for (const tid of tournament.teamIds) {
    map.set(tid, {
      teamId: tid,
      team: teams.find((t) => t.id === tid),
      played: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      avgFor: 0,
      avgAgainst: 0,
    });
  }

  for (const m of tournament.matches) {
    if (!m.played) continue;
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
  }

  for (const s of map.values()) {
    s.avgFor = s.played > 0 ? s.goalsFor / s.played : 0;
    s.avgAgainst = s.played > 0 ? s.goalsAgainst / s.played : 0;
  }

  return Array.from(map.values());
}

function CompactRow({ stat, value, rank }: { stat: TeamStats; value: string; rank: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2">
      <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">{rank}</span>
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {stat.team?.logo ? (
          <img src={stat.team.logo} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
      <span className="text-xs text-foreground truncate flex-1">
        {stat.team?.shortName || stat.team?.name || "—"}
      </span>
      <span className="text-xs font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export default function StatsView({ tournament, teams }: StatsViewProps) {
  const stats = computeStats(tournament, teams);
  const hasMatches = tournament.matches.some((m) => m.played);

  if (!hasMatches) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Nenhuma partida disputada ainda</p>
      </div>
    );
  }

  const bestAttack = [...stats].sort((a, b) => b.goalsFor - a.goalsFor || a.played - b.played).slice(0, 5);
  const bestDefense = [...stats].sort((a, b) => a.goalsAgainst - b.goalsAgainst || a.played - b.played).slice(0, 5);
  const topScorers = [...stats].sort((a, b) => b.avgFor - a.avgFor).slice(0, 5);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border">
          <Swords className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground">Melhor Ataque</h3>
        </div>
        <div className="divide-y divide-border/30">
          {bestAttack.map((s, i) => (
            <CompactRow key={s.teamId} stat={s} rank={i + 1} value={`${s.goalsFor}`} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground">Melhor Defesa</h3>
        </div>
        <div className="divide-y divide-border/30">
          {bestDefense.map((s, i) => (
            <CompactRow key={s.teamId} stat={s} rank={i + 1} value={`${s.goalsAgainst}`} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border">
          <Swords className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground">Média de Gols/Jogo</h3>
        </div>
        <div className="divide-y divide-border/30">
          {topScorers.map((s, i) => (
            <CompactRow key={s.teamId} stat={s} rank={i + 1} value={s.avgFor.toFixed(1)} />
          ))}
        </div>
      </div>
    </div>
  );
}
