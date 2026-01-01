import { Market, MaxInt, PlaylistedTrack, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";

export class SpotifyClient {
  private spotify: SpotifyApi;
  private limit = 50 as MaxInt<50>;
  private market = "US" as Market;

  constructor(clientId: string, clientSecret: string) {
    this.spotify = SpotifyApi.withClientCredentials(clientId, clientSecret);
  }

  public async getAllPlaylistedTracks(
    playlistId: string,
    fieldFilter: string,
  ): Promise<PlaylistedTrack<Track>[]> {
    let offset = 0;
    let allTracks: PlaylistedTrack<Track>[] = [];

    while (true) {
      const response = await this.spotify.playlists.getPlaylistItems(
        playlistId,
        this.market,
        fieldFilter,
        this.limit,
        offset,
      );

      allTracks = [...allTracks, ...response.items];
      if (!response.next) break;
      offset += this.limit;
    }

    return allTracks.sort(
      (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime(),
    );
  }
}
