import { StandingRow } from "@/lib/standings";
import { PromotionRule } from "@/types/tournament";
import StandingsTable from "./StandingsTable";

interface GroupStandingsViewProps {
  groupCount: number;
  standingsByGroup: Record<number, StandingRow[]>;
  promotions?: PromotionRule[];
  /**
   * Total number of knockout slots available (e.g. 16 for Oitavas).
   * When provided, the view will automatically compute how many teams
   * qualify per group and show the rest as eliminated.
   */
  totalKnockoutTeams?: number;
}

/**
 * Calculates how many teams qualify directly per group.
 * Returns: { directPositions, bestOfSlots }
 * - directPositions: positions that qualify fully (all groups)
 * - bestOfSlots: remaining spots filled by "best of next position"
 */
function calcQualification(totalKnockoutTeams: number, groupCount: number, teamsPerGroup: number) {
  let spotsLeft = totalKnockoutTeams;
  let directPositions = 0;
  while (directPositions < teamsPerGroup && spotsLeft >= groupCount) {
    directPositions++;
    spotsLeft -= groupCount;
  }
  return { directPositions, bestOfSlots: spotsLeft };
}

export default function GroupStandingsView({
  groupCount,
  standingsByGroup,
  promotions = [],
  totalKnockoutTeams,
}: GroupStandingsViewProps) {
  if (groupCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Adicione times para ver os grupos</p>
      </div>
    );
  }

  // Determine the max teams per group (may vary; use the largest)
  const teamsPerGroup = Math.max(
    ...Object.values(standingsByGroup).map((s) => s.length),
    0
  );

  // Compute qualification thresholds only when totalKnockoutTeams is provided
  const qualification =
    totalKnockoutTeams && teamsPerGroup > 0
      ? calcQualification(totalKnockoutTeams, groupCount, teamsPerGroup)
      : null;

  // The cut-off position per group:
  // - Teams ranked 1..directPositions are fully classified
  // - If bestOfSlots > 0, teams at position directPositions+1 are CANDIDATES
  //   (some qualify, some don't — we cannot know per-group without global sort)
  // - Teams ranked > directPositions+1 (or > directPositions when bestOfSlots=0) are eliminated
  const qualifyUntilPerGroup = qualification
    ? qualification.directPositions + (qualification.bestOfSlots > 0 ? 1 : 0)
    : undefined;

  // Summary label
  const summaryLabel = qualification
    ? `${qualification.directPositions} classificado${qualification.directPositions !== 1 ? "s" : ""} por grupo` +
      (qualification.bestOfSlots > 0
        ? ` + ${qualification.bestOfSlots} melhor${qualification.bestOfSlots !== 1 ? "es" : ""} ${qualification.directPositions + 1}º${qualification.directPositions + 1 !== 1 ? "s" : ""}`
        : "")
    : null;

  return (
    <div className="space-y-6">
      {summaryLabel && (
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
            {summaryLabel} → {totalKnockoutTeams} vagas no mata-mata
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
      {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => (
        <div key={groupNum}>
          <h3 className="font-display font-bold text-sm text-foreground mb-2">
            Grupo {String.fromCharCode(64 + groupNum)}
          </h3>
          <StandingsTable
            standings={standingsByGroup[groupNum] || []}
            promotions={promotions}
            qualifyUntil={qualifyUntilPerGroup}
          />
        </div>
      ))}
    </div>
  );
}
