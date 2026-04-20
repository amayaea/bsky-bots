import type { StarterAppearance } from "../mlbSchedule";

export interface ProjectionSource {
  readonly name: string;
  getProjectionForAppearance(a: StarterAppearance): Promise<number>;
  getProjectedStarterForTeam?(
    teamAbbr: string,
    ymd: string,
  ): Promise<{ name: string; mlbId: number | null } | null>;
}
