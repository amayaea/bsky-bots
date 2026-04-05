import MLBStatsAPI from "mlb-stats-api";
import type { Game, GameTeam, Player, ScheduleResponse } from "mlb-stats-api/types";
import type { SportsDataIoProjections } from "./projections/sportsDataIo";

const HYDRATE = "probablePitcher(note),team";

type HydratedTeam = GameTeam & { probablePitcher?: Player | null };

export interface StarterAppearance {
  mlbPlayerId: number;
  fullName: string;
  pitcherTeamAbbr: string;
  isHome: boolean;
  gameDate: string;
  gamePk: number;
  matchupLabel: string;
}

function teamAbbr(team: GameTeam): string {
  const t = team.team;
  return (t.abbreviation ?? t.teamName ?? t.name ?? "?").slice(0, 8);
}

async function extractFromGame(
  game: Game,
  slateDate: string,
  projections?: SportsDataIoProjections,
): Promise<StarterAppearance[]> {
  const away = game.teams.away as HydratedTeam;
  const home = game.teams.home as HydratedTeam;
  const awayAbbr = teamAbbr(away);
  const homeAbbr = teamAbbr(home);
  const matchupLabel = `${awayAbbr} @ ${homeAbbr}`;
  const out: StarterAppearance[] = [];

  const handleTeam = async (team: HydratedTeam, abbr: string, isHome: boolean) => {
    const p = team.probablePitcher;
    if (p?.id && p.fullName) {
      out.push({
        mlbPlayerId: p.id,
        fullName: p.fullName,
        pitcherTeamAbbr: abbr,
        isHome,
        gameDate: slateDate,
        gamePk: game.gamePk,
        matchupLabel,
      });
    } else if (projections) {
      // Fallback: Check projections for the highest-rated pitcher on this team/day
      const projected = await projections.getProjectedStarterForTeam(abbr, slateDate);
      if (projected) {
        out.push({
          mlbPlayerId: projected.mlbId ?? 0,
          fullName: projected.name,
          pitcherTeamAbbr: abbr,
          isHome,
          gameDate: slateDate,
          gamePk: game.gamePk,
          matchupLabel,
        });
      }
    }
  };

  await handleTeam(away, awayAbbr, false);
  await handleTeam(home, homeAbbr, true);

  return out;
}

export async function fetchScheduleGamesForDate(mlb: MLBStatsAPI, ymd: string): Promise<Game[]> {
  const res = await mlb.getSchedule({
    params: {
      sportId: 1,
      date: ymd,
      hydrate: HYDRATE,
    } as { sportId: number; date: string; hydrate: string },
  });

  if (res.status !== 200) {
    throw new Error(`MLB getSchedule failed: ${res.status} ${res.statusText}`);
  }

  const data = res.data as ScheduleResponse;
  if (!data.dates?.length) {
    return [];
  }
  return data.dates.flatMap((d) => d.games ?? []);
}

export async function getProbableStartersForDate(
  mlb: MLBStatsAPI,
  ymd: string,
  projections?: SportsDataIoProjections,
): Promise<StarterAppearance[]> {
  const games = await fetchScheduleGamesForDate(mlb, ymd);
  const results = await Promise.all(games.map((g) => extractFromGame(g, ymd, projections)));
  return results.flat();
}

/** Pitchers with at least two distinct games (by gamePk) in the given week. */
export function findTwoStartPitchers(
  appearances: StarterAppearance[],
): Map<string, [StarterAppearance, StarterAppearance]> {
  const byPlayer = new Map<string, StarterAppearance[]>();
  for (const a of appearances) {
    // Use Name + Team as the key for robustness since MLB IDs might be missing in fallback mode
    const key = `${a.fullName.toLowerCase()}|${a.pitcherTeamAbbr.toUpperCase()}`;
    const list = byPlayer.get(key) ?? [];
    if (list.some((x) => x.gamePk === a.gamePk)) {
      continue;
    }
    list.push(a);
    byPlayer.set(key, list);
  }

  const two = new Map<string, [StarterAppearance, StarterAppearance]>();
  for (const [key, list] of byPlayer) {
    if (list.length >= 2) {
      const sorted = [...list].sort((x, y) => x.gameDate.localeCompare(y.gameDate));
      // In the rare case of 3 starts, we just take the first two for the summary
      two.set(key, [sorted[0], sorted[1]]);
    }
  }
  return two;
}
