import type { StarterAppearance } from "../mlbSchedule";
import type { ProjectionSource } from "./types";

// CommonJS sub-client — avoids instantiating FantasyDataClient with keys for every sport.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MLBv3ProjectionsClient = require("fantasydata-node-client/MLB/MLBv3Projections") as new (
  apiKey: string,
) => {
  getProjectedPlayerGameStatsByDatePromise(date: string): Promise<string>;
};

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** SportsDataIO date path segment: `2026-MAR-29`. */
export function toSportsDataApiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y}-${MONTH_NAMES[m - 1]}-${String(d).padStart(2, "0")}`;
}

export type FantasyScoreField =
  | "FantasyPoints"
  | "FantasyPointsDraftKings"
  | "FantasyPointsFanDuel"
  | "FantasyPointsYahoo"
  | "FantasyPointsPitching";

export interface PlayerGameProjectionRow {
  PlayerID?: number;
  Name?: string;
  Team?: string;
  Position?: string;
  GameID?: number;
  Day?: string;
  DateTime?: string;
  FantasyPoints?: number;
  FantasyPointsDraftKings?: number;
  FantasyPointsFanDuel?: number;
  FantasyPointsYahoo?: number;
  FantasyPointsPitching?: number;
}

function normalizeName(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

function rowDayYmd(row: PlayerGameProjectionRow): string | null {
  const raw = row.Day ?? row.DateTime;
  if (!raw) {
    return null;
  }
  return raw.slice(0, 10);
}

function isProbablyPitcher(row: PlayerGameProjectionRow): boolean {
  const p = row.Position?.toUpperCase() ?? "";
  return p === "P" || p === "SP" || p === "RP";
}

function scoreFromRow(row: PlayerGameProjectionRow, field: FantasyScoreField): number {
  const v = row[field];
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

export class SportsDataIoProjections implements ProjectionSource {
  public readonly name: string;
  private readonly client: InstanceType<typeof MLBv3ProjectionsClient>;
  private readonly fantasyField: FantasyScoreField;
  private readonly mlbToSportsDataId: Map<number, number>;
  private readonly cache = new Map<string, PlayerGameProjectionRow[]>();

  constructor(
    env: NodeJS.ProcessEnv = process.env,
    overrideField?: FantasyScoreField,
    overrideName?: string,
  ) {
    const key = env.SPORTSDATAIO_API_KEY;
    if (!key) {
      throw new Error("Missing SPORTSDATAIO_API_KEY");
    }
    this.client = new MLBv3ProjectionsClient(key);
    this.fantasyField =
      overrideField ??
      (env.SPORTSDATAIO_FANTASY_FIELD as FantasyScoreField) ??
      "FantasyPointsDraftKings";
    this.name = overrideName ?? "SportsDataIO";
    this.mlbToSportsDataId = parsePlayerMap(env.SPORTSDATAIO_PLAYER_MAP);
  }

  private async loadDate(ymd: string): Promise<PlayerGameProjectionRow[]> {
    if (this.cache.has(ymd)) {
      return this.cache.get(ymd)!;
    }
    const segment = toSportsDataApiDate(ymd);
    const raw = await this.client.getProjectedPlayerGameStatsByDatePromise(segment);
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      throw new Error("SportsDataIO: expected JSON array of projections");
    }
    const rows = data as PlayerGameProjectionRow[];
    this.cache.set(ymd, rows);
    return rows;
  }

  /**
   * Projected fantasy points for one starter appearance (one game).
   * Matches by optional MLB→SportsData ID map, else normalized name + team + date.
   */
  async getProjectionForAppearance(a: StarterAppearance): Promise<number> {
    const rows = await this.loadDate(a.gameDate);
    const dayRows = rows.filter((r) => rowDayYmd(r) === a.gameDate);
    const pitchers = dayRows.filter(isProbablyPitcher);

    const mappedId = this.mlbToSportsDataId.get(a.mlbPlayerId);
    if (mappedId !== undefined) {
      const hit = pitchers.find((r) => r.PlayerID === mappedId);
      if (hit) {
        return scoreFromRow(hit, this.fantasyField);
      }
    }

    const wantName = normalizeName(a.fullName);
    const team = a.pitcherTeamAbbr.toUpperCase();
    const candidates = pitchers.filter(
      (r) => normalizeName(r.Name ?? "") === wantName && (r.Team ?? "").toUpperCase() === team,
    );
    if (candidates.length === 1) {
      return scoreFromRow(candidates[0], this.fantasyField);
    }

    const byName = pitchers.filter((r) => normalizeName(r.Name ?? "") === wantName);
    if (byName.length === 1) {
      return scoreFromRow(byName[0], this.fantasyField);
    }

    console.warn(
      `[SportsDataIO] No unique projection for ${a.fullName} (${a.pitcherTeamAbbr}) on ${a.gameDate}`,
    );
    return 0;
  }

  /**
   * Find the pitcher with the highest projection for a given team and date.
   * Useful as a fallback when MLB probables are missing.
   */
  async getProjectedStarterForTeam(
    teamAbbr: string,
    ymd: string,
  ): Promise<{ name: string; mlbId: number | null } | null> {
    const rows = await this.loadDate(ymd);
    const dayRows = rows.filter((r) => rowDayYmd(r) === ymd);
    const team = teamAbbr.toUpperCase();
    const teamPitchers = dayRows.filter(
      (r) => isProbablyPitcher(r) && (r.Team ?? "").toUpperCase() === team,
    );

    if (teamPitchers.length === 0) {
      return null;
    }

    // Sort by projection descending
    const sorted = teamPitchers.sort(
      (a, b) => scoreFromRow(b, this.fantasyField) - scoreFromRow(a, this.fantasyField),
    );

    const best = sorted[0];
    const score = scoreFromRow(best, this.fantasyField);

    // If the top projection is very low (e.g. 0), they might not be a starter.
    if (score <= 5) {
      return null;
    }

    // Try to find the MLB ID
    const sportsDataId = best.PlayerID;
    let mlbId: number | null = null;
    if (sportsDataId) {
      // Invert the map to find MLB ID from SportsData ID
      for (const [mId, sId] of this.mlbToSportsDataId.entries()) {
        if (sId === sportsDataId) {
          mlbId = mId;
          break;
        }
      }
    }

    return {
      name: best.Name ?? "Unknown",
      mlbId,
    };
  }
}

function parsePlayerMap(raw: string | undefined): Map<number, number> {
  const m = new Map<number, number>();
  if (!raw?.trim()) {
    return m;
  }
  try {
    const obj = JSON.parse(raw) as Record<string, number>;
    for (const [k, v] of Object.entries(obj)) {
      m.set(Number(k), Number(v));
    }
  } catch {
    console.warn("SPORTSDATAIO_PLAYER_MAP is not valid JSON; ignoring.");
  }
  return m;
}
