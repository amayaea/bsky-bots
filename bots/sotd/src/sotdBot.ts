import { BskyClient } from "@bsky-bots/common";
import { SpotifyClient } from "./spotifyClient";
import { FIELDS_FILTER, PLAYLIST_ID } from "./constants";
import { AppBskyEmbedExternal, RichText } from "@atproto/api";
import { SimplifiedArtist, Track } from "@spotify/web-api-ts-sdk";

export class SotdBot {
  private spotify: SpotifyClient;
  private bsky: BskyClient;

  constructor() {
    this.spotify = new SpotifyClient(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!,
    );
    this.bsky = new BskyClient(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
  }

  public async run(): Promise<void> {
    await this.bsky.login();

    const tracks = await this.spotify.getPlaylistedTracks(PLAYLIST_ID, FIELDS_FILTER);
    const track = tracks[0].track;
    console.log(track);
    // const posts = await this.bsky.getAllPosts(TEST_BOT_HANDLE);
    const rt = this.mapTrackToRichText(track);
    this.bsky.post(rt, this.getTrackEmbed(track));
  }

  private mapTrackToRichText = (track: Track): RichText => {
    const result = new RichText({
      text: `Today's Song of the Day is ${track.name} by ${this.mapArtistsToText(track.artists)}. ${track.external_urls.spotify}`,
    });
    return result;
  };

  private getTrackEmbed = (track: Track): AppBskyEmbedExternal.Main => {
    return {
      $type: "app.bsky.embed.external#view",
      external: {
        uri: track.external_urls.spotify,
        title: track.name,
        description: `${this.mapArtistsToText(track.artists)} · ${track.album.name} · Song · ${this.getReleaseYear(track.album.release_date)}`,
        // check BlobRef type
        // thumb: track.album.images[0].url,
      },
    };
  };

  private mapArtistsToText = (artists: SimplifiedArtist[]): string => {
    return artists.map((artist) => artist.name).join(", ");
  };

  private getReleaseYear = (releaseDate: string): string => {
    return releaseDate.split("-")[0];
  };
}
