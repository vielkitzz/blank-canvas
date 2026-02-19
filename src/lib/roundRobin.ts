import { Match } from "@/types/tournament";

/**
 * Generate round-robin fixtures for a list of team IDs.
 * Supports 1 or 2 turns (home/away reversal).
 */
export function generateRoundRobin(
  tournamentId: string,
  teamIds: string[],
  turnos: 1 | 2 = 1
): Match[] {
  const ids = [...teamIds];
  // If odd number of teams, add a "bye" placeholder
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push("__BYE__");

  const n = ids.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const matches: Match[] = [];

  // Circle method: fix first team, rotate the rest
  const fixed = ids[0];
  const rotating = ids.slice(1);

  for (let r = 0; r < totalRounds; r++) {
    const round = r + 1;
    const current = [fixed, ...rotating];

    for (let m = 0; m < matchesPerRound; m++) {
      const home = current[m];
      const away = current[n - 1 - m];

      if (home === "__BYE__" || away === "__BYE__") continue;

      matches.push({
        id: crypto.randomUUID(),
        tournamentId,
        round,
        homeTeamId: home,
        awayTeamId: away,
        homeScore: 0,
        awayScore: 0,
        played: false,
      });
    }

    // Rotate: move last element of rotating to the front
    rotating.unshift(rotating.pop()!);
  }

  if (turnos === 2) {
    const secondLeg = matches.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      round: m.round + totalRounds,
      homeTeamId: m.awayTeamId,
      awayTeamId: m.homeTeamId,
    }));
    return [...matches, ...secondLeg];
  }

  return matches;
}
