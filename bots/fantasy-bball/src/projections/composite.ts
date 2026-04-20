import { StarterAppearance } from "../mlbSchedule";
import { ProjectionSource } from "./types";

export class CompositeProjections implements ProjectionSource {
  public readonly name = "Average";

  constructor(private readonly sources: ProjectionSource[]) {}

  async getProjectionForAppearance(a: StarterAppearance): Promise<number> {
    if (this.sources.length === 0) {
      return 0;
    }

    const scores = await Promise.all(this.sources.map((s) => s.getProjectionForAppearance(a)));
    const validScores = scores.filter((s) => s > 0);

    if (validScores.length === 0) {
      return 0;
    }

    const sum = validScores.reduce((acc, s) => acc + s, 0);
    return sum / validScores.length;
  }

  async getSourceProjections(a: StarterAppearance): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    await Promise.all(
      this.sources.map(async (s) => {
        results[s.name] = await s.getProjectionForAppearance(a);
      }),
    );
    return results;
  }

  async getProjectedStarterForTeam(
    teamAbbr: string,
    ymd: string,
  ): Promise<{ name: string; mlbId: number | null } | null> {
    // Try all sources that implement this, return the first hit or the one with highest proj if possible.
    // For simplicity, let's just use the first source that provides a result.
    for (const source of this.sources) {
      if (source.getProjectedStarterForTeam) {
        const res = await source.getProjectedStarterForTeam(teamAbbr, ymd);
        if (res) {
          return res;
        }
      }
    }
    return null;
  }
}
