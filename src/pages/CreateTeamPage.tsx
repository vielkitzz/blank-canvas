import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { processImage, revokeImagePreview } from "@/lib/imageUtils";
import { uploadLogo } from "@/lib/storageUtils";

export default function CreateTeamPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { teams, loading, addTeam, updateTeam } = useTournamentStore();
  const existingTeam = editId ? teams.find((t) => t.id === editId) : null;

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [color1, setColor1] = useState("#1e40af");
  const [color2, setColor2] = useState("#ffffff");
  const [rate, setRate] = useState("3.00");

  // logoUrl = persisted Storage URL (saved to DB)
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  // previewUrl = temporary Object URL for display only
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  // pendingBlob = WebP blob waiting to be uploaded on submit
  const [pendingBlob, setPendingBlob] = useState<{ blob: Blob; filename: string } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke Object URLs on unmount to free memory
  useEffect(() => {
    return () => {
      if (previewUrl) revokeImagePreview(previewUrl);
    };
  }, [previewUrl]);

  // Populate form when team data loads
  useEffect(() => {
    if (existingTeam && !initialized) {
      setName(existingTeam.name);
      setShortName(existingTeam.shortName || "");
      setAbbreviation(existingTeam.abbreviation || "");
      setFoundingYear(existingTeam.foundingYear?.toString() || "");
      setColor1(existingTeam.colors?.[0] || "#333333");
      setColor2(existingTeam.colors?.[1] || "#cccccc");
      setRate(existingTeam.rate?.toString() || "3.00");
      setLogoUrl(existingTeam.logo);
      setPreviewUrl(existingTeam.logo); // show existing logo (Storage URL)
      setInitialized(true);
    }
  }, [existingTeam, initialized]);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke old preview
    if (previewUrl && previewUrl.startsWith("blob:")) revokeImagePreview(previewUrl);

    try {
      const processed = await processImage(file);
      setPreviewUrl(processed.previewUrl);
      setPendingBlob({ blob: processed.blob, filename: processed.filename });
    } catch (err) {
      toast.error("Erro ao processar imagem");
      console.error(err);
    }
  };

  const handleRemoveLogo = () => {
    if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
    setPreviewUrl(undefined);
    setLogoUrl(undefined);
    setPendingBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Digite o nome do time");
      return;
    }

    setUploading(true);
    let finalLogoUrl = logoUrl; // default: keep existing URL

    try {
      // Upload the new WebP blob if one is pending
      if (pendingBlob) {
        const teamId = editId || crypto.randomUUID();
        const path = `teams/${teamId}.webp`;
        finalLogoUrl = await uploadLogo(pendingBlob.blob, path);
        // Revoke the temporary Object URL now that upload is done
        if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
        setPreviewUrl(finalLogoUrl);
        setPendingBlob(null);
      } else if (!previewUrl) {
        // User removed logo
        finalLogoUrl = undefined;
      }

      const teamData = {
        name: name.trim(),
        shortName: shortName.trim() || name.trim().substring(0, 10),
        abbreviation: abbreviation.trim() || name.trim().substring(0, 3).toUpperCase(),
        foundingYear: foundingYear ? parseInt(foundingYear) : undefined,
        colors: [color1, color2],
        rate: Math.min(9.99, Math.max(0.01, parseFloat(rate) || 3)),
        logo: finalLogoUrl,
      };

      if (editId && existingTeam) {
        await updateTeam(editId, teamData);
        toast.success(`"${teamData.name}" atualizado!`);
      } else {
        await addTeam({ id: crypto.randomUUID(), ...teamData });
        toast.success(`"${teamData.name}" criado!`);
      }
      navigate("/teams");
    } catch (err) {
      toast.error("Erro ao salvar o time. Tente novamente.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (editId && loading) {
    return (
      <div className="p-6 lg:p-8 max-w-lg space-y-6">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const displayLogo = previewUrl;

  return (
    <div className="p-6 lg:p-8 max-w-lg">
      <button
        onClick={() => navigate("/teams")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {editId ? "Editar Time" : "Criar Time"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          {editId ? "Atualize as informações do time" : "Preencha as informações do time"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Escudo</Label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
              >
                {displayLogo ? (
                  <img src={displayLogo} alt="Escudo" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
              />
              <div className="flex flex-col gap-1">
                {displayLogo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs text-destructive hover:underline text-left"
                  >
                    Remover
                  </button>
                )}
                {pendingBlob && (
                  <span className="text-[10px] text-muted-foreground">
                    WebP • pronto para envio
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Nome Completo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Futbol Club Barcelona"
              className="bg-secondary border-border"
              required
            />
          </div>

          {/* Short Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Nome Curto</Label>
              <Input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Ex: Barcelona"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Abreviação (3 letras)</Label>
              <Input
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="BAR"
                maxLength={3}
                className="bg-secondary border-border uppercase"
              />
            </div>
          </div>

          {/* Founding Year */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Ano de Fundação</Label>
            <Input
              type="number"
              value={foundingYear}
              onChange={(e) => setFoundingYear(e.target.value)}
              placeholder="Ex: 1899"
              className="bg-secondary border-border"
              min={1800}
              max={2100}
            />
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Cores</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
                />
                <Input
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  placeholder="#1e40af"
                  className="bg-secondary border-border w-28 text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
                />
                <Input
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  placeholder="#ffffff"
                  className="bg-secondary border-border w-28 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Rate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Rate <span className="text-muted-foreground font-normal">(0.01 – 9.99)</span>
            </Label>
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              step="0.01"
              min="0.01"
              max="9.99"
              className="bg-secondary border-border w-32 font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={uploading}
            className="w-full font-display font-semibold text-base h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow transition-all"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </span>
            ) : editId ? "Salvar Alterações" : "Criar Time"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
