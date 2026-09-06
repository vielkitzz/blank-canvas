/**
 * squadEvolution.ts
 *
 * Recalibração de elenco pelo rate do clube e envelhecimento de temporada.
 * Módulo puro: sem React, sem Supabase.
 */

import { Player } from "@/types/tournament";
import { clampSkill } from "@/lib/playerSkill";
import { skillAnchorForRate } from "@/lib/squadGenerator";

export interface SquadChange {
  player: Player;
  oldSkill: number;
  newSkill: number;
  oldAge?: number;
  newAge?: number;
}

/**
 * Recalibra o elenco quando o rate do clube muda.
 * Cada jogador mantém o seu desvio em relação à âncora do rate,
 * preservando a hierarquia interna do elenco.
 */
export function recalibrateSquadToRate(players: Player[], oldRate: number, newRate: number): SquadChange[] {
  const delta = skillAnchorForRate(newRate) - skillAnchorForRate(oldRate);
  return players.map((player) => {
    const oldSkill = player.skill ?? 70;
    return { player, oldSkill, newSkill: clampSkill(oldSkill + delta) };
  });
}

/**
 * Evolução por idade: jovens crescem, veteranos regridem.
 * Determinístico — a prévia e a aplicação produzem o mesmo resultado.
 */
export function skillDeltaForAge(age: number | undefined): number {
  if (age == null) return 0;
  if (age <= 19) return 3;
  if (age <= 22) return 2;
  if (age <= 25) return 1;
  if (age <= 28) return 0;
  if (age <= 31) return -1;
  if (age <= 34) return -2;
  return -3;
}

/** Avança a temporada do elenco: +1 ano de idade e evolução/regressão de habilidade. */
export function advanceSquadSeason(players: Player[]): SquadChange[] {
  return players.map((player) => {
    const oldSkill = player.skill ?? 70;
    const oldAge = player.age ?? undefined;
    const newAge = oldAge != null ? oldAge + 1 : undefined;
    return {
      player,
      oldSkill,
      newSkill: clampSkill(oldSkill + skillDeltaForAge(oldAge)),
      oldAge,
      newAge,
    };
  });
}

/** Apenas as mudanças que alteram algum valor. */
export function effectiveChanges(changes: SquadChange[]): SquadChange[] {
  return changes.filter((c) => c.newSkill !== c.oldSkill || (c.newAge != null && c.newAge !== c.oldAge));
}
