import MLBStatsAPI from "mlb-stats-api";
import { BskyClient } from "@bsky-bots/common";
import { getMondayThroughSundayAfterThisSundayEt, getTomorrowYmdEt, isSundayEt } from "./dateUtils";
import { postThread } from "./formatPosts";
import {
  findTwoStartPitchers,
  getProbableStartersForDate,
  type StarterAppearance,
} from "./mlbSchedule";
import { SportsDataIoProjections } from "./projections/sportsDataIo";

function appearanceLine(a: StarterAppearance): string {
  return `${a.gameDate} ${a.matchupLabel}`;
}

export class FantasyBballBot {
  private readonly mlb = new MLBStatsAPI();
  private readonly bsky: BskyClient;
  private readonly projections: SportsDataIoProjections;

  constructor() {
    this.bsky = new BskyClient(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
    this.projections = new SportsDataIoProjections();
  }

  public async run(): Promise<void> {
    await this.bsky.login();

    const tomorrow = getTomorrowYmdEt();
    await this.postDailyRankings(tomorrow);

    if (isSundayEt()) {
      await this.postSundayTwoStarts();
    }
  }

  private fantasyLabel(): string {
    const f = process.env.SPORTSDATAIO_FANTASY_FIELD ?? "FantasyPointsDraftKings";
    return f.replace("FantasyPoints", "").replace(/^DraftKings$/i, "DK") || "fantasy";
  }

  private async postDailyRankings(tomorrowYmd: string): Promise<void> {
    const starters = await getProbableStartersForDate(this.mlb, tomorrowYmd);
    if (starters.length === 0) {
      console.log(`No probable starters for ${tomorrowYmd}; skipping daily post.`);
      return;
    }

    const scored = await Promise.all(
      starters.map(async (s) => ({
        s,
        pts: await this.projections.getProjectionForAppearance(s),
      })),
    );
    scored.sort((a, b) => b.pts - a.pts);

    const lines = [
      `MLB SP ranks (probables tomorrow ${tomorrowYmd} ET, ${this.fantasyLabel()} proj)`,
      "",
      ...scored.map(
        ({ s, pts }, i) =>
          `${i + 1}. ${s.fullName} (${s.pitcherTeamAbbr}) ${pts.toFixed(1)} — ${s.matchupLabel}`,
      ),
    ];

    await postThread(this.bsky, lines.join("\n"));
  }

  private async postSundayTwoStarts(): Promise<void> {
    const week = getMondayThroughSundayAfterThisSundayEt();
    const appearances: StarterAppearance[] = [];
    for (const d of week) {
      appearances.push(...(await getProbableStartersForDate(this.mlb, d)));
    }

    const twoMap = findTwoStartPitchers(appearances);
    if (twoMap.size === 0) {
      console.log(
        "No two-start pitchers detected for the upcoming week; skipping extra Sunday post.",
      );
      return;
    }

    type Row = {
      name: string;
      total: number;
      a1: StarterAppearance;
      a2: StarterAppearance;
      p1: number;
      p2: number;
    };

    const rows: Row[] = [];
    for (const [, [a1, a2]] of twoMap) {
      const p1 = await this.projections.getProjectionForAppearance(a1);
      const p2 = await this.projections.getProjectionForAppearance(a2);
      rows.push({
        name: a1.fullName,
        total: p1 + p2,
        a1,
        a2,
        p1,
        p2,
      });
    }

    rows.sort((a, b) => b.total - a.total);

    const lines = [
      `Two-start SPs Mon–Sun ${week[0]}–${week[6]} ET (${this.fantasyLabel()} sum)`,
      "",
      ...rows.map(
        (r, i) =>
          `${i + 1}. ${r.name} — ${r.total.toFixed(1)} (${r.p1.toFixed(1)} ${appearanceLine(r.a1)}; ${r.p2.toFixed(1)} ${appearanceLine(r.a2)})`,
      ),
    ];

    await postThread(this.bsky, lines.join("\n"));
  }
}
