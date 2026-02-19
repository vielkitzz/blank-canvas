import { useState } from "react";
import { Match, Team, Tournament, KnockoutStage, STAGE_TEAM_COUNTS } from "@/types/tournament";
import { Shield, Play, Zap, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateFullMatch } from "@/lib/simulation";
import MatchPopup from "./MatchPopup";

interface BracketViewProps {
  tournament: Tournament;
  teams: Team[];
  onUpdateMatch: (match: Match) => void;
  onBatchUpdateMatches?: (matches: Match[]) => void;
  onGenerateBracket: () => void;
  onFinalize?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  "1/64": "32-avos",
  "1/32": "16-avos",
  "1/16": "Oitavas",
  "1/8": "Quartas",
  "1/4": "Semi",
  "1/2": "Final",
};

function getStagesFromStart(start: KnockoutStage): string[] {
  const all = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];
  const idx = all.indexOf(start);
  return idx >= 0 ? all.slice(idx) : ["1/2"];
}

/** Returns aggregate score for a home-away pair */
function getAggregate(leg1: Match, leg2: Match): { home: number; away: number } {
  // leg1: homeTeamId is "home team of the tie"
  // leg2: homeTeamId is "away team of the tie" (reversed)
  const home = leg1.homeScore + (leg1.homeExtraTime || 0) + leg2.awayScore + (leg2.awayExtraTime || 0);
  const away = leg1.awayScore + (leg1.awayExtraTime || 0) + leg2.homeScore + (leg2.homeExtraTime || 0);
  return { home, away };
}

function getTieWinner(leg1: Match, leg2: Match, awayGoalsRule: boolean): string | null {
  if (!leg1.played || !leg2.played) return null;
  const agg = getAggregate(leg1, leg2);
  if (agg.home > agg.away) return leg1.homeTeamId;
  if (agg.away > agg.home) return leg1.awayTeamId;
  // Away goals rule: leg2 away goals = leg1 team's goals in leg2 (they're away in leg2)
  if (awayGoalsRule) {
    const awayGoalsHome = leg2.awayScore + (leg2.awayExtraTime || 0); // homeTeamId's away goals
    const awayGoalsAway = leg1.awayScore + (leg1.awayExtraTime || 0); // awayTeamId's away goals
    if (awayGoalsHome > awayGoalsAway) return leg1.homeTeamId;
    if (awayGoalsAway > awayGoalsHome) return leg1.awayTeamId;
  }
  // Penalties in leg2
  if (leg2.homePenalties !== undefined && leg2.awayPenalties !== undefined) {
    // leg2 home = awayTeamId of the tie, leg2 away = homeTeamId of the tie
    return (leg2.awayPenalties || 0) > (leg2.homePenalties || 0) ? leg1.homeTeamId : leg1.awayTeamId;
  }
  return null;
}

export default function BracketView({
  tournament,
  teams,
  onUpdateMatch,
  onBatchUpdateMatches,
  onGenerateBracket,
  onFinalize,
}: BracketViewProps) {
  const matches = tournament.matches;
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const getTeam = (id: string) => teams.find((t) => t.id === id);

  const legMode = tournament.settings.knockoutLegMode || "single";
  const finalSingleLeg = tournament.settings.finalSingleLeg ?? true;
  const thirdPlaceMatch = tournament.settings.thirdPlaceMatch ?? false;
  const awayGoalsRule = tournament.settings.awayGoalsRule ?? false;

  if (matches.length === 0) {
    const hasEnoughTeams = tournament.teamIds.length >= 2;
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-3">
          {hasEnoughTeams
            ? "Gere o chaveamento para começar"
            : `Adicione pelo menos 2 times (${tournament.teamIds.length} adicionados)`}
        </p>
        {hasEnoughTeams && (
          <Button onClick={onGenerateBracket} className="gap-2 bg-primary text-primary-foreground">
            <Play className="w-4 h-4" />
            Gerar Chaveamento
          </Button>
        )}
      </div>
    );
  }

  const startStage = tournament.mataMataInicio || "1/8";
  const stages = getStagesFromStart(startStage);

  // Separate regular matches from third-place match
  const regularMatches = matches.filter((m) => !m.isThirdPlace);
  const thirdPlaceMatches = matches.filter((m) => m.isThirdPlace);

  // Map rounds to stages — group by round number AND leg
  const matchesByStage: Record<string, Match[]> = {};
  stages.forEach((stage, i) => {
    matchesByStage[stage] = regularMatches.filter((m) => m.round === i + 1);
  });

  // For home-away: group by pairId
  function getPairs(stageMatches: Match[]): Array<{ leg1: Match; leg2: Match | null }> {
    const pairMap = new Map<string, { leg1?: Match; leg2?: Match }>();
    const singles: Match[] = [];
    for (const m of stageMatches) {
      if (m.pairId) {
        if (!pairMap.has(m.pairId)) pairMap.set(m.pairId, {});
        const pair = pairMap.get(m.pairId)!;
        if (m.leg === 1) pair.leg1 = m;
        else pair.leg2 = m;
      } else {
        singles.push(m);
      }
    }
    const result: Array<{ leg1: Match; leg2: Match | null }> = [];
    for (const pair of pairMap.values()) {
      if (pair.leg1) result.push({ leg1: pair.leg1, leg2: pair.leg2 || null });
    }
    for (const s of singles) result.push({ leg1: s, leg2: null });
    return result;
  }

  const allRegularPlayed = regularMatches.length > 0 && regularMatches.every((m) => m.played);

  const getSingleMatchWinner = (match: Match): string | null => {
    if (!match.played) return null;
    const homeTotal = match.homeScore + (match.homeExtraTime || 0);
    const awayTotal = match.awayScore + (match.awayExtraTime || 0);
    if (homeTotal > awayTotal) return match.homeTeamId;
    if (awayTotal > homeTotal) return match.awayTeamId;
    if (match.homePenalties !== undefined && match.awayPenalties !== undefined) {
      return (match.homePenalties || 0) > (match.awayPenalties || 0) ? match.homeTeamId : match.awayTeamId;
    }
    return null;
  };

  // Get winner for a tie (could be 1 or 2 legs)
  const getTieResult = (pair: { leg1: Match; leg2: Match | null }): string | null => {
    if (!pair.leg2) return getSingleMatchWinner(pair.leg1);
    return getTieWinner(pair.leg1, pair.leg2, awayGoalsRule);
  };

  // Get loser for semi-final (for 3rd place)
  const getSemiLoser = (pair: { leg1: Match; leg2: Match | null }): string | null => {
    const winner = getTieResult(pair);
    if (!winner) return null;
    return winner === pair.leg1.homeTeamId ? pair.leg1.awayTeamId : pair.leg1.homeTeamId;
  };

  const simulateMatch = (match: Match): Match => {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const homeRate = tournament.settings.rateInfluence ? (home?.rate ?? 5) : 5;
    const awayRate = tournament.settings.rateInfluence ? (away?.rate ?? 5) : 5;
    const result = simulateFullMatch(homeRate, awayRate);
    let homeScore = result.total[0];
    let awayScore = result.total[1];
    let homePenalties: number | undefined;
    let awayPenalties: number | undefined;
    if (homeScore === awayScore) {
      homePenalties = Math.floor(Math.random() * 3) + 3;
      awayPenalties = homePenalties + (Math.random() > 0.5 ? 1 : -1);
      if (awayPenalties < 0) awayPenalties = homePenalties + 1;
    }
    return {
      ...match,
      homeScore,
      awayScore,
      played: true,
      ...(homePenalties !== undefined && { homePenalties, awayPenalties }),
    };
  };

  const simulateLeg2 = (leg2: Match, leg1: Match): Match => {
    const home = getTeam(leg2.homeTeamId);
    const away = getTeam(leg2.awayTeamId);
    const homeRate = tournament.settings.rateInfluence ? (home?.rate ?? 5) : 5;
    const awayRate = tournament.settings.rateInfluence ? (away?.rate ?? 5) : 5;
    const result = simulateFullMatch(homeRate, awayRate);
    let homeScore = result.total[0];
    let awayScore = result.total[1];
    let homePenalties: number | undefined;
    let awayPenalties: number | undefined;

    // Check if aggregate is tied after this leg
    const agg = getAggregate(leg1, { ...leg2, homeScore, awayScore });
    if (agg.home === agg.away && !awayGoalsRule) {
      homePenalties = Math.floor(Math.random() * 3) + 3;
      awayPenalties = homePenalties + (Math.random() > 0.5 ? 1 : -1);
      if (awayPenalties < 0) awayPenalties = homePenalties + 1;
    }
    return {
      ...leg2,
      homeScore,
      awayScore,
      played: true,
      ...(homePenalties !== undefined && { homePenalties, awayPenalties }),
    };
  };

  const handleSimulateStage = (stage: string) => {
    const stageMatches = matchesByStage[stage]?.filter((m) => !m.played && m.homeTeamId && m.awayTeamId) || [];
    if (stageMatches.length === 0) return;
    const updated = stageMatches.map((match) => {
      // Find pair for this match
      if (match.pairId && match.leg === 2) {
        const leg1 = matchesByStage[stage].find((m) => m.pairId === match.pairId && m.leg === 1);
        if (leg1 && leg1.played) return simulateLeg2(match, leg1);
      }
      return simulateMatch(match);
    });
    if (onBatchUpdateMatches) {
      onBatchUpdateMatches(updated);
    } else {
      updated.forEach((m) => onUpdateMatch(m));
    }
  };

  const handleSimulateThirdPlace = () => {
    const unplayed = thirdPlaceMatches.filter((m) => !m.played && m.homeTeamId && m.awayTeamId);
    if (unplayed.length === 0) return;
    const updated = unplayed.map(simulateMatch);
    if (onBatchUpdateMatches) onBatchUpdateMatches(updated);
    else updated.forEach((m) => onUpdateMatch(m));
  };

  const handleAdvanceStage = (stageIndex: number) => {
    const stage = stages[stageIndex];
    const nextStage = stages[stageIndex + 1];
    if (!nextStage) return;

    const stageMatchesList = matchesByStage[stage] || [];
    const nextStageMatches = matchesByStage[nextStage] || [];

    // Check all ties are resolved
    const pairs = getPairs(stageMatchesList);
    const allResolved = pairs.every((p) => getTieResult(p) !== null);
    if (!allResolved) return;

    if (nextStageMatches.length > 0) return;

    const winners = pairs.map(getTieResult).filter(Boolean) as string[];
    const isFinalStage = stageIndex + 1 === stages.length - 1;
    const useSingleLeg = legMode === "single" || (isFinalStage && finalSingleLeg);

    const newMatches: Match[] = [];
    if (useSingleLeg) {
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: stageIndex + 2,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            played: false,
          });
        }
      }
    } else {
      // Home-and-away
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          const pairId = crypto.randomUUID();
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: stageIndex + 2,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            played: false,
            leg: 1,
            pairId,
          });
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: stageIndex + 2,
            homeTeamId: winners[i + 1],
            awayTeamId: winners[i],
            homeScore: 0,
            awayScore: 0,
            played: false,
            leg: 2,
            pairId,
          });
        }
      }
    }

    // Generate 3rd place match if enabled and this is the semi-final advancing to final
    const finalStageIdx = stages.length - 1;
    const semiStageIdx = stages.length - 2;
    if (thirdPlaceMatch && stageIndex === semiStageIdx && !matches.some((m) => m.isThirdPlace)) {
      const losers = pairs.map(getSemiLoser).filter(Boolean) as string[];
      if (losers.length === 2) {
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: stageIndex + 2,
          homeTeamId: losers[0],
          awayTeamId: losers[1],
          homeScore: 0,
          awayScore: 0,
          played: false,
          isThirdPlace: true,
        });
      }
    }

    if (newMatches.length > 0 && onBatchUpdateMatches) {
      onBatchUpdateMatches([...matches, ...newMatches]);
    }
  };

  // Render a pair (single or home-away)
  const renderPair = (pair: { leg1: Match; leg2: Match | null }, pairIdx: number) => {
    const winner = getTieResult(pair);
    const isHomeAway = !!pair.leg2;
    const { leg1, leg2 } = pair;

    const homeTeam = getTeam(leg1.homeTeamId);
    const awayTeam = getTeam(leg1.awayTeamId);

    if (!isHomeAway) {
      // Single leg
      const match = leg1;
      const matchWinner = getSingleMatchWinner(match);
      return (
        <button
          key={match.id}
          onClick={() => setSelectedMatch(match)}
          className="w-[168px] rounded-lg bg-secondary/30 border border-border hover:border-primary/40 transition-all text-left overflow-hidden"
        >
          <TeamRow team={homeTeam} score={match.played ? match.homeScore + (match.homeExtraTime || 0) : undefined} isWinner={matchWinner === match.homeTeamId} borderBottom />
          <TeamRow team={awayTeam} score={match.played ? match.awayScore + (match.awayExtraTime || 0) : undefined} isWinner={matchWinner === match.awayTeamId} />
          {match.played && match.homePenalties !== undefined && (
            <div className="text-center py-0.5 bg-secondary/50">
              <span className="text-[9px] text-muted-foreground">Pên: {match.homePenalties}×{match.awayPenalties}</span>
            </div>
          )}
        </button>
      );
    }

    // Home-away tie
    const agg = leg1.played && leg2?.played ? getAggregate(leg1, leg2) : null;
    return (
      <div key={`${leg1.id}-pair`} className="w-[168px] rounded-lg border border-border overflow-hidden">
        {/* Aggregate display */}
        {agg && (
          <div className="flex items-center justify-between px-2 py-0.5 bg-secondary/50 border-b border-border/50">
            <span className="text-[9px] text-muted-foreground">Agregado</span>
            <span className={`text-[9px] font-bold ${agg.home > agg.away ? "text-foreground" : agg.away > agg.home ? "text-muted-foreground" : "text-muted-foreground"}`}>
              {homeTeam?.abbreviation || "—"} {agg.home}–{agg.away} {awayTeam?.abbreviation || "—"}
            </span>
          </div>
        )}
        {/* Leg 1 */}
        <button
          className="w-full text-left hover:bg-secondary/20 transition-colors border-b border-border/30"
          onClick={() => setSelectedMatch(leg1)}
        >
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border/20">
            <span className="text-[8px] text-muted-foreground">Ida</span>
          </div>
          <TeamRow team={homeTeam} score={leg1.played ? leg1.homeScore : undefined} isWinner={false} borderBottom compact />
          <TeamRow team={awayTeam} score={leg1.played ? leg1.awayScore : undefined} isWinner={false} compact />
        </button>
        {/* Leg 2 */}
        {leg2 && (
          <button
            className="w-full text-left hover:bg-secondary/20 transition-colors"
            onClick={() => setSelectedMatch(leg2)}
          >
            <div className="flex items-center gap-1 px-2 py-1 border-b border-border/20">
              <span className="text-[8px] text-muted-foreground">Volta</span>
            </div>
            {/* In leg2, away team of leg1 is home */}
            <TeamRow team={awayTeam} score={leg2.played ? leg2.homeScore : undefined} isWinner={false} borderBottom compact />
            <TeamRow team={homeTeam} score={leg2.played ? leg2.awayScore : undefined} isWinner={false} compact />
            {leg2.played && leg2.homePenalties !== undefined && (
              <div className="text-center py-0.5 bg-secondary/50">
                <span className="text-[9px] text-muted-foreground">Pên: {leg2.homePenalties}×{leg2.awayPenalties}</span>
              </div>
            )}
          </button>
        )}
        {/* Tie winner indicator */}
        {winner && (
          <div className="px-2 py-0.5 bg-primary/10 border-t border-primary/20">
            <span className="text-[9px] text-primary font-bold">
              ✓ {getTeam(winner)?.abbreviation || "—"}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Bracket visualization */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max items-start">
          {stages.map((stage, stageIdx) => {
            const stageMatchesList = matchesByStage[stage] || [];
            const pairs = getPairs(stageMatchesList);
            const unplayed = stageMatchesList.filter((m) => !m.played && m.homeTeamId && m.awayTeamId);
            const allStagePairsResolved = pairs.length > 0 && pairs.every((p) => getTieResult(p) !== null);
            const nextStage = stages[stageIdx + 1];
            const nextHasMatches = nextStage && (matchesByStage[nextStage]?.length || 0) > 0;
            const isFinal = stageIdx === stages.length - 1;

            return (
              <div key={stage} className="flex flex-col items-center" style={{ minWidth: 176 }}>
                {/* Stage header */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    {STAGE_LABELS[stage] || stage}
                  </span>
                  {legMode === "home-away" && !isFinal && (
                    <span className="text-[9px] text-muted-foreground">(I/V)</span>
                  )}
                </div>

                {/* Simulate button */}
                {unplayed.length > 0 && (
                  <button
                    onClick={() => handleSimulateStage(stage)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold mb-2 transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    Simular ({unplayed.length})
                  </button>
                )}

                {/* Advance button */}
                {allStagePairsResolved && nextStage && !nextHasMatches && (
                  <button
                    onClick={() => handleAdvanceStage(stageIdx)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 text-[10px] mb-2 transition-colors border border-border"
                  >
                    Avançar →
                  </button>
                )}

                {/* Match cards */}
                <div className="flex flex-col gap-2 justify-center flex-1">
                  {pairs.length === 0 ? (
                    <div className="w-[168px] p-3 rounded-lg border border-dashed border-border bg-secondary/20 text-center">
                      <span className="text-[10px] text-muted-foreground">Aguardando</span>
                    </div>
                  ) : (
                    pairs.map((pair, i) => renderPair(pair, i))
                  )}
                </div>
              </div>
            );
          })}

          {/* Champion column */}
          {(() => {
            const finalStage = stages[stages.length - 1];
            const finalMatchesList = matchesByStage[finalStage] || [];
            const finalPairs = getPairs(finalMatchesList);
            const finalPair = finalPairs[0];
            const champion = finalPair ? getTieResult(finalPair) : null;
            const championTeam = champion ? getTeam(champion) : null;

            if (!championTeam) return null;

            return (
              <div className="flex flex-col items-center justify-start pt-8 min-w-[110px]">
                <div className="mb-2 text-center">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Campeão</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <Trophy className="w-5 h-5 text-primary" />
                  <div className="w-8 h-8 flex items-center justify-center">
                    {championTeam.logo ? (
                      <img src={championTeam.logo} alt="" className="w-8 h-8 object-contain" />
                    ) : (
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-foreground text-center">{championTeam.abbreviation || championTeam.shortName}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Third-place match */}
      {thirdPlaceMatches.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Medal className="w-4 h-4 text-warning" />
            <span className="text-xs font-bold text-foreground">Disputa de 3º Lugar</span>
            {thirdPlaceMatches.some((m) => !m.played) && (
              <button
                onClick={handleSimulateThirdPlace}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold transition-colors"
              >
                <Zap className="w-2.5 h-2.5" />
                Simular
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {thirdPlaceMatches.map((match) => {
              const w = getSingleMatchWinner(match);
              const home = getTeam(match.homeTeamId);
              const away = getTeam(match.awayTeamId);
              return (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className="w-[168px] rounded-lg bg-secondary/30 border border-warning/30 hover:border-warning/60 transition-all text-left overflow-hidden"
                >
                  <TeamRow team={home} score={match.played ? match.homeScore : undefined} isWinner={w === match.homeTeamId} borderBottom />
                  <TeamRow team={away} score={match.played ? match.awayScore : undefined} isWinner={w === match.awayTeamId} />
                </button>
              );
            })}
            {(() => {
              const w = thirdPlaceMatches[0]?.played ? getSingleMatchWinner(thirdPlaceMatches[0]) : null;
              const thirdTeam = w ? getTeam(w) : null;
              if (!thirdTeam) return null;
              return (
                <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30">
                  <Medal className="w-4 h-4 text-warning" />
                  <span className="text-[10px] font-bold text-foreground">{thirdTeam.abbreviation || thirdTeam.shortName}</span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Finalize banner */}
      {allRegularPlayed && !tournament.finalized && onFinalize && (
        <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Chaveamento concluído!</span>
          <Button onClick={onFinalize} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
            <Trophy className="w-3.5 h-3.5" />
            Finalizar
          </Button>
        </div>
      )}

      {tournament.finalized && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Temporada {tournament.year} finalizada</span>
        </div>
      )}

      {/* Match Popup */}
      {selectedMatch && (
        <MatchPopup
          match={selectedMatch}
          homeTeam={getTeam(selectedMatch.homeTeamId)}
          awayTeam={getTeam(selectedMatch.awayTeamId)}
          rateInfluence={tournament.settings.rateInfluence}
          tournament={tournament}
          allTeams={teams}
          onSave={(updated) => {
            onUpdateMatch(updated);
            setSelectedMatch(null);
          }}
          onCancel={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  borderBottom,
  compact,
}: {
  team?: Team;
  score?: number;
  isWinner: boolean;
  borderBottom?: boolean;
  compact?: boolean;
}) {
  const py = compact ? "py-1" : "py-1.5";
  return (
    <div className={`flex items-center gap-1.5 px-2 ${py} ${borderBottom ? "border-b border-border/40" : ""} ${isWinner ? "bg-primary/10" : ""}`}>
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {team?.logo ? (
          <img src={team.logo} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <Shield className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
      <span className={`text-[11px] flex-1 truncate ${isWinner ? "font-bold text-foreground" : "text-foreground"}`}>
        {team?.abbreviation || team?.shortName || "TBD"}
      </span>
      {score !== undefined && (
        <span className={`text-[11px] font-bold min-w-[14px] text-right ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
          {score}
        </span>
      )}
    </div>
  );
}
