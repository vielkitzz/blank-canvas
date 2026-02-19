import { SeasonRecord } from "@/types/tournament";
import { Trophy, Shield } from "lucide-react";

interface GalleryViewProps {
  seasons: SeasonRecord[];
}

export default function GalleryView({ seasons }: GalleryViewProps) {
  if (seasons.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhuma temporada finalizada ainda
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Finalize uma temporada para registrar o campeão
        </p>
      </div>
    );
  }

  const sorted = [...seasons].sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-2">
      {sorted.map((season) => (
        <div
          key={season.year}
          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors"
        >
          <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-xs font-bold text-muted-foreground min-w-[40px]">
            {season.year}
          </span>
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            {season.championLogo ? (
              <img src={season.championLogo} alt="" className="w-7 h-7 object-contain" />
            ) : (
              <Shield className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm font-bold text-foreground truncate">
            {season.championName}
          </span>
        </div>
      ))}
    </div>
  );
}
