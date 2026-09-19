import MLBStatsAPI from "mlb-stats-api";
import type { Game, GameTeam, Player, ScheduleResponse } from "mlb-stats-api/types";
import type { ProjectionSource } from "./projections";

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

/**
 * Maps MLB API team IDs to SportsDataIO compatible abbreviations.
 * This is much more robust than relying on name/abbreviation strings.
 */
export const MLB_TEAM_ID_TO_SDIO: Record<number, string> = {
  108: "LAA",
  109: "ARI",
  110: "BAL",
  111: "BOS",
  112: "CHC",
  113: "CIN",
  114: "CLE",
  115: "COL",
  116: "DET",
  117: "HOU",
  118: "KC",
  119: "LAD",
  120: "WAS",
  121: "NYM",
  133: "ATH", // Athletics
  134: "PIT",
  135: "SD",
  136: "SEA",
  137: "SF",
  138: "STL",
  139: "TB",
  140: "TEX",
  141: "TOR",
  142: "MIN",
  143: "PHI",
  144: "ATL",
  145: "CWS",
  146: "MIA",
  147: "NYY",
  158: "MIL",
};

function teamAbbr(team: GameTeam): string {
  const t = team.team;
  if (t.id && MLB_TEAM_ID_TO_SDIO[t.id]) {
    return MLB_TEAM_ID_TO_SDIO[t.id];
  }
  const raw = (t.abbreviation ?? t.teamName ?? t.name ?? "?").toUpperCase();
  return normalizeTeamAbbr(raw);
}

/**
 * Fallback mapping for string-based abbreviations.
 */
export function normalizeTeamAbbr(abbr: string): string {
  const map: Record<string, string> = {
    AZ: "ARI",
    CHW: "CWS",
    KCR: "KC",
    SDP: "SD",
    SFG: "SF",
    TBR: "TB",
    WSH: "WAS",
    WSN: "WAS",
    OAK: "ATH",
    ANA: "LAA",
    FLA: "MIA",
    "BLUE JAYS": "TOR",
    "RED SOX": "BOS",
    "WHITE SOX": "CWS",
    CUBS: "CHC",
    BRAVES: "ATL",
  };
  return map[abbr] ?? (abbr.length > 3 ? abbr.slice(0, 3) : abbr);
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // Noon to avoid DST issues
}

async function extractFromGame(
  game: Game,
  slateDate: string,
  projections?: ProjectionSource,
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
    } else if (projections?.getProjectedStarterForTeam) {
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
  projections?: ProjectionSource,
): Promise<StarterAppearance[]> {
  const games = await fetchScheduleGamesForDate(mlb, ymd);
  if (games.length === 0) {
    console.log(`[mlbSchedule] No games found for ${ymd}`);
  }
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

      // Ensure starts are at least 3 days apart (SP rest)
      for (let i = 0; i < sorted.length - 1; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const d1 = parseYmd(sorted[i].gameDate);
          const d2 = parseYmd(sorted[j].gameDate);
          const diffDays = Math.round(
            Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (diffDays >= 3) {
            two.set(key, [sorted[i], sorted[j]]);
            break;
          }
        }
        if (two.has(key)) break;
      }
    }
  }
  return two;
}
