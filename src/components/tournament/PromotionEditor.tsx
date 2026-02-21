import { useState } from "react";
import { Tournament, PromotionRule } from "@/types/tournament";
import { Shield } from "lucide-react";
import { StandingRow } from "@/lib/standings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PromotionEditorProps {
  tournament: Tournament;
  standings: StandingRow[];
  onUpdate: (promotions: PromotionRule[]) => void;
  standingsByGroup?: Record<number, StandingRow[]>;
}

const ZONE_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#06b6d4",
];

function colorFromZone(zoneId: string) {
  const text = zoneId.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return ZONE_COLORS[hash % ZONE_COLORS.length];
}

export default function PromotionEditor({
  tournament,
  standings,
  onUpdate,
  standingsByGroup,
}: PromotionEditorProps) {
  const promotions = tournament.settings.promotions || [];
  const isGrupos = tournament.format === "grupos" && standingsByGroup && Object.keys(standingsByGroup).length > 0;

  const [positionInput, setPositionInput] = useState("1");
  const [zoneInput, setZoneInput] = useState("");

  const getZone = (pos: number) => promotions.find((p) => p.position === pos);

  const applyZone = () => {
    const pos = parseInt(positionInput, 10);
    const zoneId = zoneInput.trim();
    if (!Number.isFinite(pos) || pos < 1) return;

    const next = promotions.filter((p) => p.position !== pos);
    if (zoneId) {
      next.push({
        position: pos,
        type: "playoff",
        color: colorFromZone(zoneId),
        targetCompetition: zoneId,
      });
    }
    next.sort((a, b) => a.position - b.position);
    onUpdate(next);
    setZoneInput("");
  };

  const clearZone = (pos: number) => {
    onUpdate(promotions.filter((p) => p.position !== pos));
  };

  const renderPositionTable = (rows: StandingRow[], label?: string) => (
    <div className="rounded-lg border border-border overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 bg-secondary/40 border-b border-border">
          <span className="text-xs font-bold text-foreground">{label}</span>
        </div>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-secondary/50 text-muted-foreground">
            <th className="py-1.5 px-2 text-left w-8">#</th>
            <th className="py-1.5 px-2 text-left">Time</th>
            <th className="py-1.5 px-2 text-left">Zona</th>
            <th className="py-1.5 px-2 text-right w-16">Acao</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pos = i + 1;
            const zone = getZone(pos);
            return (
              <tr
                key={row.teamId}
                className="border-t border-border/50"
                style={zone ? { borderLeft: `3px solid ${zone.color}` } : undefined}
              >
                <td className="py-2 px-2 text-muted-foreground font-mono">{pos}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {row.team?.logo ? (
                        <img src={row.team.logo} alt="" className="w-4 h-4 object-contain" />
                      ) : (
                        <Shield className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-foreground truncate">{row.team?.shortName || row.team?.name || "-"}</span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  {zone ? (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: zone.color + "20", color: zone.color }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                      {zone.targetCompetition}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Sem zona</span>
                  )}
                </td>
                <td className="py-2 px-2 text-right">
                  {zone ? (
                    <button onClick={() => clearZone(pos)} className="text-destructive text-[10px] hover:underline">
                      Limpar
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const groupCount = tournament.gruposQuantidade || 1;
  const gridCols =
    groupCount <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : groupCount <= 4
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Defina um identificador de zona por posicao (ex.: Classifica, Libertadores, Rebaixamento).
      </p>

      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr_auto] gap-2">
          <Input
            type="number"
            min={1}
            value={positionInput}
            onChange={(e) => setPositionInput(e.target.value)}
            className="h-8 text-xs bg-secondary border-border"
            placeholder="Pos."
          />
          <Input
            value={zoneInput}
            onChange={(e) => setZoneInput(e.target.value)}
            className="h-8 text-xs bg-secondary border-border"
            placeholder="Identificador da zona"
          />
          <Button onClick={applyZone} size="sm" className="h-8 px-3 text-xs">
            Aplicar
          </Button>
        </div>
      </div>

      {isGrupos ? (
        <div className={cn("grid gap-3", gridCols)}>
          {Array.from({ length: groupCount }, (_, i) => i + 1).map((g) => {
            const groupStandings = standingsByGroup![g] || [];
            return (
              <div key={g}>
                {renderPositionTable(groupStandings, `Grupo ${String.fromCharCode(64 + g)}`)}
              </div>
            );
          })}
        </div>
      ) : (
        renderPositionTable(standings)
      )}
    </div>
  );
}
