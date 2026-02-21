import { useState } from "react";
import { Match, Team } from "@/types/tournament";
import { Shield, Search, X, UserPlus, UserMinus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BracketTeamEditorProps {
  match: Match;
  allTeams: Team[];
  side: "home" | "away";
  onUpdate: (updatedMatch: Match) => void;
  onClose: () => void;
}

export default function BracketTeamEditor({
  match,
  allTeams,
  side,
  onUpdate,
  onClose,
}: BracketTeamEditorProps) {
  const [search, setSearch] = useState("");
  const currentTeamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const currentTeam = allTeams.find((t) => t.id === currentTeamId);

  const filtered = allTeams.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.shortName?.toLowerCase().includes(q) ||
      t.abbreviation?.toLowerCase().includes(q)
    );
  });

  const handleSelect = (teamId: string) => {
    const updated = {
      ...match,
      [side === "home" ? "homeTeamId" : "awayTeamId"]: teamId,
      // Reset scores when changing teams
      homeScore: 0,
      awayScore: 0,
      played: false,
      homePenalties: undefined,
      awayPenalties: undefined,
      homeExtraTime: undefined,
      awayExtraTime: undefined,
    };
    onUpdate(updated);
    onClose();
  };

  const handleRemove = () => {
    const updated = {
      ...match,
      [side === "home" ? "homeTeamId" : "awayTeamId"]: "",
      homeScore: 0,
      awayScore: 0,
      played: false,
    };
    onUpdate(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-card border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              {side === "home" ? "Mandante" : "Visitante"}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Current team */}
        {currentTeamId && currentTeam && (
          <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center">
                {currentTeam.logo ? (
                  <img src={currentTeam.logo} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <Shield className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs font-medium text-foreground">{currentTeam.name}</span>
            </div>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              <UserMinus className="w-3 h-3" />
              Remover
            </button>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar time..."
              className="pl-8 h-8 text-xs bg-secondary border-border"
              autoFocus
            />
          </div>
        </div>

        {/* Team list */}
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhum time encontrado
            </div>
          ) : (
            filtered.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelect(team.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 hover:bg-secondary/60 transition-colors text-left border-b border-border/30 ${
                  team.id === currentTeamId ? "bg-primary/10" : ""
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {team.logo ? (
                    <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground truncate block">{team.name}</span>
                  {team.abbreviation && (
                    <span className="text-[10px] text-muted-foreground">{team.abbreviation}</span>
                  )}
                </div>
                {team.id === currentTeamId && (
                  <span className="text-[10px] text-primary font-bold">Atual</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
