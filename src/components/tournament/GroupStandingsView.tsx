import { StandingRow } from "@/lib/standings";
import StandingsTable from "./StandingsTable";

interface GroupStandingsViewProps {
  groupCount: number;
  standingsByGroup: Record<number, StandingRow[]>;
}

export default function GroupStandingsView({
  groupCount,
  standingsByGroup,
}: GroupStandingsViewProps) {
  if (groupCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Adicione times para ver os grupos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => (
        <div key={groupNum}>
          <h3 className="font-display font-bold text-sm text-foreground mb-2">
            Grupo {String.fromCharCode(64 + groupNum)}
          </h3>
          <StandingsTable
            standings={standingsByGroup[groupNum] || []}
          />
        </div>
      ))}
    </div>
  );
}