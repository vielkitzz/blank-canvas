import { useState, useCallback, DragEvent, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { Team, TeamFolder } from "@/types/tournament";
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

/* ================= TEAM CARD ================= */

function TeamCard({
  team,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  team: Team;
  onEdit: () => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("team-id", team.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="p-3 rounded-xl card-gradient border border-border hover:border-primary/40 transition-all relative overflow-hidden group cursor-grab active:cursor-grabbing"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl overflow-hidden flex flex-col">
        <div className="flex-1" style={{ backgroundColor: team.colors[0] || "hsl(var(--primary))" }} />
        <div className="flex-1" style={{ backgroundColor: team.colors[1] || "hsl(var(--secondary))" }} />
      </div>

      <div className="flex items-center gap-2 pl-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />

        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          {team.logo ? (
            <img
              src={team.logo}
              alt=""
              className="w-10 h-10 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Shield className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-sm truncate">{team.name}</h3>
          <p className="text-xs text-primary font-mono">{(team.rate ?? 0).toFixed(2)}</p>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-secondary">
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button onClick={onDuplicate} className="p-1.5 rounded-md hover:bg-secondary">
            <Copy className="w-3.5 h-3.5" />
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-destructive/20">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir "{team.name}"?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function TeamsPage() {
  const {
    teams,
    folders,
    removeTeam,
    addTeam,
    loading,
    addFolder,
    renameFolder,
    removeFolder,
    moveTeamToFolder,
    moveFolderToFolder,
  } = useTournamentStore();

  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  /* ================= HELPERS ================= */

  const matchesSearch = useCallback(
    (team: Team) => {
      const q = search.toLowerCase();
      return (
        (team.name || "").toLowerCase().includes(q) ||
        (team.shortName || "").toLowerCase().includes(q) ||
        (team.abbreviation || "").toLowerCase().includes(q)
      );
    },
    [search],
  );

  const isDescendant = (sourceId: string, targetId: string): boolean => {
    const target = folders.find((f) => f.id === targetId);
    if (!target) return false;
    if (target.parentId === sourceId) return true;
    if (!target.parentId) return false;
    return isDescendant(sourceId, target.parentId);
  };

  const handleDrop = useCallback(
    (e: DragEvent, folderId: string | null) => {
      e.preventDefault();
      setDragOverFolder(null);

      const teamId = e.dataTransfer.getData("team-id");
      const sourceFolderId = e.dataTransfer.getData("folder-id");

      if (teamId) {
        moveTeamToFolder(teamId, folderId);
        toast.success("Time movido!");
      } else if (
        sourceFolderId &&
        sourceFolderId !== folderId &&
        folderId !== null &&
        !isDescendant(sourceFolderId, folderId)
      ) {
        moveFolderToFolder(sourceFolderId, folderId);
        toast.success("Pasta movida!");
      }
    },
    [moveTeamToFolder, moveFolderToFolder, folders],
  );

  /* ================= RENDER ================= */

  const unfolderedTeams = teams.filter((t) => !t.folderId).filter(matchesSearch);

  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase">Meus Times</h1>
          <p className="text-sm text-muted-foreground">Arraste times entre pastas</p>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <Input
              placeholder="Buscar time..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <button
            onClick={async () => {
              const id = await addFolder("Nova Pasta");
              if (id) {
                setOpenFolders((prev) => new Set(prev).add(id));
                setEditingFolderId(id);
                setEditingFolderName("Nova Pasta");
              }
            }}
            className="p-2 border rounded-lg"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div
          className="space-y-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e as unknown as DragEvent, null)}
        >
          {/* UNFOLDERED TEAMS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {unfolderedTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onEdit={() => navigate(`/teams/create?edit=${team.id}`)}
                onDuplicate={(e) =>
                  addTeam({
                    ...team,
                    id: crypto.randomUUID(),
                    name: `${team.name} (cópia)`,
                  })
                }
                onDelete={() => removeTeam(team.id)}
              />
            ))}

            <motion.button
              onClick={() => navigate("/teams/create")}
              className="h-[76px] rounded-xl border-2 border-dashed flex items-center justify-center"
            >
              <Plus className="w-8 h-8" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
