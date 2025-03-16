import { PlaylistedTrack, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";

export class SpotifyClient {
  private spotify: SpotifyApi;

  constructor(clientId: string, clientSecret: string) {
    this.spotify = SpotifyApi.withClientCredentials(clientId, clientSecret);
  }

  private async getPlaylistedTracks(playlistId: string, filter: string, offset: number) {
    console.log("Getting playlisted tracks for", playlistId, offset);
    const response = await this.spotify.playlists.getPlaylistItems(
      playlistId,
      "US",
      filter,
      50,
      offset,
    );
    return response;
  }

  public async getAllPlaylistedTracks(
    playlistId: string,
    fields?: string,
  ): Promise<PlaylistedTrack<Track>[]> {
    const limit = 50; // Spotify's max limit per request
    let offset = 0;
    let allTracks: PlaylistedTrack<Track>[] = [];

    while (true) {
      const response = await this.spotify.playlists.getPlaylistItems(
        playlistId,
        undefined,
        fields,
        limit,
        offset,
      );
      allTracks = [...allTracks, ...response.items];

      if (!response.next) {
        break; // No more items to fetch
      }

      offset += limit;
    }

    return allTracks;
  }
}
