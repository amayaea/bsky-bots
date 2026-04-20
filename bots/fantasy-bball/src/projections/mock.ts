import { StarterAppearance } from "../mlbSchedule";
import { ProjectionSource } from "./types";

export class MockProjections implements ProjectionSource {
  public readonly name = "Mock Source";

  async getProjectionForAppearance(a: StarterAppearance): Promise<number> {
    // Return something proportional to MLB ID just for variety
    return (a.mlbPlayerId % 100) / 10 + 20;
  }
}
