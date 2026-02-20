import { useState } from "react";
import { Shield, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StandingRow } from "@/lib/standings";
import { cn } from "@/lib/utils";

interface GroupQualificationViewProps {
  groupCount: number;
  standingsByGroup: Record<number, StandingRow[]>;
  totalKnockoutTeams: number;
  allGroupMatchesPlayed: boolean;
  /** IDs já confirmados (quando groupsFinalized = true) */
  confirmedTeamIds?: string[];
  onConfirm: (qualifiedTeamIds: string[]) => void;
}

export default function GroupQualificationView({
  groupCount,
  standingsByGroup,
  totalKnockoutTeams,
  allGroupMatchesPlayed,
  confirmedTeamIds,
  onConfirm,
}: GroupQualificationViewProps) {
  const isReadonly = !!confirmedTeamIds && confirmedTeamIds.length > 0;

  // Seed initial selection from already-confirmed IDs
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(confirmedTeamIds ?? [])
  );

  const toggle = (teamId: string) => {
    if (isReadonly || !allGroupMatchesPlayed) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const count = selected.size;
  const isReady = count === totalKnockoutTeams;

  // Determine grid cols based on group count
  const gridCols =
    groupCount === 1
      ? "grid-cols-1"
      : groupCount === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : groupCount <= 4
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2"
      : groupCount <= 6
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={!isReady || !allGroupMatchesPlayed || isReadonly}
          size="sm"
          className={cn(
            "gap-2 shrink-0",
            isReadonly
              ? "bg-primary/20 text-primary cursor-default"
              : "bg-primary text-primary-foreground"
          )}
        >
          <Trophy className="w-4 h-4" />
          {isReadonly ? "Classificados Confirmados" : "Confirmar e Gerar Mata-Mata"}
        </Button>
      </div>

      {/* ── Group Cards Grid ── */}
      <div className={cn("grid gap-4", gridCols)}>
        {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => {
          const groupStandings = standingsByGroup[groupNum] || [];

          return (
            <div
              key={groupNum}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="px-4 py-2.5 border-b border-border bg-secondary/40">
                <h3 className="font-display font-bold text-sm text-foreground">
                  Grupo {String.fromCharCode(64 + groupNum)}
                </h3>
              </div>

              {/* Team list */}
              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[30px_minmax(190px,1.8fr)_repeat(8,minmax(48px,1fr))] items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/40 bg-secondary/20">
                    <span>#</span>
                    <span>Time</span>
                    <span className="text-center">PTS</span>
                    <span className="text-center">J</span>
                    <span className="text-center">V</span>
                    <span className="text-center">E</span>
                    <span className="text-center">D</span>
                    <span className="text-center">GP</span>
                    <span className="text-center">GC</span>
                    <span className="text-center">SG</span>
                  </div>

                {groupStandings.map((row, idx) => {
                  const isSelected = selected.has(row.teamId);

                  return (
                    <button
                      key={row.teamId}
                      onClick={() => toggle(row.teamId)}
                      disabled={isReadonly || !allGroupMatchesPlayed}
                      className={cn(
                        "w-full grid grid-cols-[30px_minmax(190px,1.8fr)_repeat(8,minmax(48px,1fr))] items-center gap-2 px-4 py-2.5 text-left transition-all border-b border-border/40",
                        isSelected
                          ? "bg-primary/8 hover:bg-primary/12"
                          : "hover:bg-secondary/40",
                        (isReadonly || !allGroupMatchesPlayed) && "cursor-default"
                      )}
                    >
                      {/* Position */}
                      <span className="text-[11px] text-muted-foreground font-mono text-right">
                        {idx + 1}
                      </span>

                      {/* Name */}
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 flex items-center justify-center shrink-0">
                          {row.team?.logo ? (
                            <img src={row.team.logo} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </span>
                        <span className={cn(
                          "text-xs font-medium truncate",
                          isSelected ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {row.team?.shortName || row.team?.name || "—"}
                        </span>
                      </span>

                      <span className={cn("text-xs font-bold tabular-nums text-center", isSelected ? "text-primary" : "text-muted-foreground")}>{row.points}</span>
                      <span className="text-xs tabular-nums text-center text-muted-foreground">{row.played}</span>
                      <span className="text-xs tabular-nums text-center text-muted-foreground">{row.wins}</span>
                      <span className="text-xs tabular-nums text-center text-muted-foreground">{row.draws}</span>
                      <span className="text-xs tabular-nums text-center text-muted-foreground">{row.losses}</span>
                      <span className="text-xs tabular-nums text-center text-muted-foreground">{row.goalsFor}</span>
                      <span className="text-xs tabular-nums text-center text-muted-foreground">{row.goalsAgainst}</span>
                      <span className={cn(
                        "text-xs font-semibold tabular-nums text-center",
                        row.goalDifference > 0
                          ? "text-emerald-400"
                          : row.goalDifference < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                      )}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </span>
                    </button>
                  );
                })}
                </div>

                {groupStandings.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Nenhum time
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
