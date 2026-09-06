import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Player } from "@/types/tournament";
import { advanceSquadSeason, effectiveChanges, recalibrateSquadToRate, SquadChange } from "@/lib/squadEvolution";
import RichText from "@/components/RichText";

interface SquadEvolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squad: Player[];
  teamRate: number;
  /** Aplica as mudanças (skill/idade) e, quando informado, o novo rate do clube. */
  onApply: (changes: SquadChange[], newRate?: number) => Promise<void> | void;
}

export default function SquadEvolutionDialog({
  open,
  onOpenChange,
  squad,
  teamRate,
  onApply,
}: SquadEvolutionDialogProps) {
  const [mode, setMode] = useState<"rate" | "age">("rate");
  const [rateValue, setRateValue] = useState(String(teamRate ?? 5));
  const [saving, setSaving] = useState(false);

  const parsedRate = Math.min(9.99, Math.max(0.01, parseFloat(rateValue) || teamRate || 5));

  const changes = useMemo(() => {
    const all = mode === "rate" ? recalibrateSquadToRate(squad, teamRate ?? 5, parsedRate) : advanceSquadSeason(squad);
    return effectiveChanges(all);
  }, [mode, squad, teamRate, parsedRate]);

  async function handleApply() {
    setSaving(true);
    try {
      await onApply(changes, mode === "rate" ? parsedRate : undefined);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rate e idade do elenco</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button variant={mode === "rate" ? "default" : "outline"} size="sm" onClick={() => setMode("rate")}>
            Mudar rate
          </Button>
          <Button variant={mode === "age" ? "default" : "outline"} size="sm" onClick={() => setMode("age")}>
            Avançar idade
          </Button>
        </div>

        {mode === "rate" ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Novo rate do clube (0,01 – 9,99)</label>
            <Input type="number" step="0.01" value={rateValue} onChange={(e) => setRateValue(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              A hierarquia do elenco é preservada: todos sobem ou descem na mesma medida.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Todos ganham 1 ano. Jovens evoluem, veteranos regridem. Elencos de outros anos não são alterados.
          </p>
        )}

        <div className="max-h-64 overflow-auto rounded-lg border divide-y">
          {changes.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhuma mudança prevista.</div>
          ) : (
            changes.map((c) => (
              <div key={c.player.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                <RichText className="truncate">{c.player.name}</RichText>
                <span className="text-muted-foreground tabular-nums">
                  {c.oldAge != null && c.newAge != null && c.oldAge !== c.newAge && (
                    <span className="mr-3">
                      {c.oldAge} → {c.newAge} anos
                    </span>
                  )}
                  {c.oldSkill} → {c.newSkill}
                </span>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={saving || changes.length === 0}>
            {saving ? "Aplicando..." : `Aplicar (${changes.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
