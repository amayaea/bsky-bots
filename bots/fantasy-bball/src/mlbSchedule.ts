import MLBStatsAPI from "mlb-stats-api";
import type { Game, GameTeam, Player, ScheduleResponse } from "mlb-stats-api/types";

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

function extractFromGame(game: Game, slateDate: string): StarterAppearance[] {
  const away = game.teams.away as HydratedTeam;
  const home = game.teams.home as HydratedTeam;
  const awayAbbr = teamAbbr(away);
  const homeAbbr = teamAbbr(home);
  const matchupLabel = `${awayAbbr} @ ${homeAbbr}`;
  const out: StarterAppearance[] = [];

  const awayPitcher = away.probablePitcher;
  if (awayPitcher?.id && awayPitcher.fullName) {
    out.push({
      mlbPlayerId: awayPitcher.id,
      fullName: awayPitcher.fullName,
      pitcherTeamAbbr: awayAbbr,
      isHome: false,
      gameDate: slateDate,
      gamePk: game.gamePk,
      matchupLabel,
    });
  }

  const homePitcher = home.probablePitcher;
  if (homePitcher?.id && homePitcher.fullName) {
    out.push({
      mlbPlayerId: homePitcher.id,
      fullName: homePitcher.fullName,
      pitcherTeamAbbr: homeAbbr,
      isHome: true,
      gameDate: slateDate,
      gamePk: game.gamePk,
      matchupLabel,
    });
  }

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
): Promise<StarterAppearance[]> {
  const games = await fetchScheduleGamesForDate(mlb, ymd);
  return games.flatMap((g) => extractFromGame(g, ymd));
}

/** Pitchers with exactly two distinct games (by gamePk) in the given week. */
export function findTwoStartPitchers(
  appearances: StarterAppearance[],
): Map<number, [StarterAppearance, StarterAppearance]> {
  const byPlayer = new Map<number, StarterAppearance[]>();
  for (const a of appearances) {
    const list = byPlayer.get(a.mlbPlayerId) ?? [];
    if (list.some((x) => x.gamePk === a.gamePk)) {
      continue;
    }
    list.push(a);
    byPlayer.set(a.mlbPlayerId, list);
  }

  const two = new Map<number, [StarterAppearance, StarterAppearance]>();
  for (const [id, list] of byPlayer) {
    if (list.length === 2) {
      const sorted = [...list].sort((x, y) => x.gameDate.localeCompare(y.gameDate));
      two.set(id, [sorted[0], sorted[1]]);
    }
  }
  return two;
}
