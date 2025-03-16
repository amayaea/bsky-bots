import { BskyClient } from "@bsky-bots/common";
import { SpotifyClient } from "./spotifyClient";
import { FIELDS_FILTER, PLAYLIST_ID } from "./constants";
import { AppBskyEmbedExternal, RichText } from "@atproto/api";
import { PlaylistedTrack, SimplifiedArtist, Track } from "@spotify/web-api-ts-sdk";
import { DubClient } from "./dubClient";

export class SotdBot {
  private spotify: SpotifyClient;
  private bsky: BskyClient;
  private dub: DubClient;

  constructor() {
    this.spotify = new SpotifyClient(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!,
    );
    this.bsky = new BskyClient(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
    this.dub = new DubClient();
  }

  public async run(): Promise<void> {
    await this.bsky.login();

    const tracks: PlaylistedTrack<Track>[] = (
      await this.spotify.getAllPlaylistedTracks(PLAYLIST_ID, FIELDS_FILTER)
    ).sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());

    // const posts: FeedViewPost[] = await this.bsky.getAllPosts(this.bsky.getUsername());

    // const songsToPost = this.findSongsToPost(tracks, posts);

    const rt = this.mapTrackToRichText(tracks[0].track);
    this.bsky.post(rt, await this.getTrackEmbed(tracks[0].track));
  }

  // private findSongsToPost = (tracks: PlaylistedTrack<Track>[], posts: FeedViewPost[]): Track[] => {};

  private mapTrackToRichText = (track: Track): RichText => {
    const result = new RichText({
      text: `Today's Song of the Day is ${track.name} by ${this.mapArtistsToText(track.artists)}. ${track.external_urls.spotify}`,
    });
    return result;
  };

  private getTrackEmbed = async (track: Track): Promise<AppBskyEmbedExternal.Main> => {
    try {
      const uri = track.external_urls.spotify;
      const metatags = await this.dub.getMetatags(uri);
      const blob = await fetch(metatags.image).then((r) => r.blob());
      const uploadBlobResponse = await this.bsky.uploadBlob(blob);

      return {
        $type: "app.bsky.embed.external",
        external: {
          uri,
          title: metatags.title,
          description: metatags.description,
          thumb: uploadBlobResponse.blob,
        },
      };
    } catch (error) {
      console.error("Failed to create track embed:", error);
      throw error;
    }
  };

  private mapArtistsToText = (artists: SimplifiedArtist[]): string => {
    return artists.map((artist) => artist.name).join(", ");
  };
}
