import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h1 className="text-5xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">Página não encontrada</p>
        <Button
          onClick={() => navigate("/")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-display font-semibold"
        >
          Voltar ao início
        </Button>
      </motion.div>
    </div>
  );
}
