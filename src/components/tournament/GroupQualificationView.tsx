import { useState } from "react";
import { CheckCircle2, Circle, Shield, Trophy, Users } from "lucide-react";
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
  const isOver = count > totalKnockoutTeams;

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
      {/* ── Counter + Confirm Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
            isReady ? "bg-primary/20" : isOver ? "bg-destructive/20" : "bg-secondary"
          )}>
            <Users className={cn(
              "w-4 h-4",
              isReady ? "text-primary" : isOver ? "text-destructive" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-none mb-0.5">
              <span className={cn(
                "font-bold text-lg tabular-nums",
                isReady ? "text-primary" : isOver ? "text-destructive" : "text-foreground"
              )}>
                {count}
              </span>
              <span className="text-muted-foreground font-normal">
                &thinsp;/&thinsp;{totalKnockoutTeams} selecionados
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {!allGroupMatchesPlayed
                ? "Jogue todos os jogos para selecionar"
                : isReadonly
                ? "Classificados confirmados ✓"
                : isReady
                ? "Pronto para confirmar!"
                : isOver
                ? `Remova ${count - totalKnockoutTeams} time${count - totalKnockoutTeams !== 1 ? "s" : ""}`
                : `Selecione mais ${totalKnockoutTeams - count} time${totalKnockoutTeams - count !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:block flex-1 mx-4">
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isReady ? "bg-primary" : isOver ? "bg-destructive" : "bg-primary/40"
              )}
              style={{ width: `${Math.min(100, (count / totalKnockoutTeams) * 100)}%` }}
            />
          </div>
        </div>

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

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          Classificado
        </span>
        <span className="flex items-center gap-1.5">
          <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
          Eliminado
        </span>
        {!allGroupMatchesPlayed && (
          <span className="text-warning ml-auto">⚠ Jogos pendentes</span>
        )}
      </div>

      {/* ── Group Cards Grid ── */}
      <div className={cn("grid gap-4", gridCols)}>
        {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => {
          const groupStandings = standingsByGroup[groupNum] || [];
          const groupSelected = groupStandings.filter((s) => selected.has(s.teamId)).length;

          return (
            <div
              key={groupNum}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="px-4 py-2.5 border-b border-border bg-secondary/40 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-foreground">
                  Grupo {String.fromCharCode(64 + groupNum)}
                </h3>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  groupSelected > 0
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {groupSelected} ✓
                </span>
              </div>

              {/* Team list */}
              <div className="divide-y divide-border/40">
                {groupStandings.map((row, idx) => {
                  const isSelected = selected.has(row.teamId);
                  const isEliminated = !isSelected;

                  return (
                    <button
                      key={row.teamId}
                      onClick={() => toggle(row.teamId)}
                      disabled={isReadonly || !allGroupMatchesPlayed}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all",
                        isSelected
                          ? "bg-primary/8 hover:bg-primary/12"
                          : "hover:bg-secondary/40",
                        (isReadonly || !allGroupMatchesPlayed) && "cursor-default"
                      )}
                    >
                      {/* Position */}
                      <span className="text-[11px] text-muted-foreground font-mono w-4 shrink-0 text-right">
                        {idx + 1}
                      </span>

                      {/* Check icon */}
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                      )}

                      {/* Logo */}
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {row.team?.logo ? (
                          <img src={row.team.logo} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Name */}
                      <span className={cn(
                        "flex-1 text-xs font-medium truncate",
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {row.team?.shortName || row.team?.name || "—"}
                      </span>

                      {/* Points + badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}>
                          {row.points}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                            CLS
                          </span>
                        )}
                        {!isSelected && allGroupMatchesPlayed && !isReadonly && (
                          <span className="text-[9px] font-medium uppercase text-destructive/60">
                            ELM
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

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
