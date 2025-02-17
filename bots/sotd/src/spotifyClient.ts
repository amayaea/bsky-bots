import { PlaylistedTrack, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";

export class SpotifyClient {
  private spotify: SpotifyApi;

  constructor(clientId: string, clientSecret: string) {
    this.spotify = SpotifyApi.withClientCredentials(clientId, clientSecret);
  }

  public async getTracks(playlistId: string, filter: string): Promise<PlaylistedTrack<Track>[]> {
    const response = await this.spotify.playlists.getPlaylistItems(playlistId, "US", filter);
    return response.items;
  }
}
