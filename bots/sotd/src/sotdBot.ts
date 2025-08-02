import { BskyClient } from "@bsky-bots/common";
import { SpotifyClient } from "./spotifyClient";
import { FIELDS_FILTER, PLAYLIST_ID } from "./constants";
import { AppBskyEmbedExternal, RichText } from "@atproto/api";
import { PlaylistedTrack, SimplifiedArtist, Track } from "@spotify/web-api-ts-sdk";
import { MetatagsClient } from "./metatagsClient";
import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { BskyPost } from "./types";

export class SotdBot {
  private spotify: SpotifyClient;
  private bsky: BskyClient;
  private metatags: MetatagsClient;

  constructor() {
    this.spotify = new SpotifyClient(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!,
    );
    this.bsky = new BskyClient(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
    this.metatags = new MetatagsClient();
  }

  public async run(): Promise<void> {
    await this.bsky.login();

    const tracks: PlaylistedTrack<Track>[] = await this.spotify.getAllPlaylistedTracks(
      PLAYLIST_ID,
      FIELDS_FILTER,
    );

    const authorFeed: FeedViewPost[] = await this.bsky.getWholeAuthorFeed(
      this.bsky.getUsername(),
      "posts_with_media",
    );

    await this.findSongsToPost(tracks, authorFeed);

    const rt = this.mapTrackToRichText(tracks[0].track);
    this.bsky.post(rt, await this.getTrackEmbed(tracks[0].track));
  }

  private async findSongsToPost(
    playlistedTracks: PlaylistedTrack<Track>[],
    feedViewPosts: FeedViewPost[],
  ): Promise<Track[]> {
    const result: Track[] = [];

    const posts = feedViewPosts
      .map((feedViewPost) => feedViewPost.post.record as BskyPost)
      .map((record) => {
        return {
          text: record.text,
          createdAt: new Date(record.createdAt),
        };
      });

    const tracks = playlistedTracks.map((track) => {
      return {
        name: track.track.name,
        artist: track.track.artists[0].name,
        album: track.track.album.name,
        added: new Date(track.added_at),
      };
    });

    console.table(
      posts.map((post) => {
        return {
          text: post.text,
          createdAt: post.createdAt,
        };
      }),
    );

    console.table(
      tracks.map((t) => ({
        name: t.name,
        artist: t.artist,
        album: t.album,
        added: t.added,
      })),
    );

    return result;
  }

  private mapTrackToRichText = (track: Track): RichText => {
    const result = new RichText({
      text: `Today's Song of the Day is ${track.name} by ${this.mapArtistsToText(track.artists)}. ${track.external_urls.spotify}`,
    });
    return result;
  };

  private getTrackEmbed = async (track: Track): Promise<AppBskyEmbedExternal.Main> => {
    try {
      const uri = track.external_urls.spotify;
      const metatags = await this.metatags.getMetatags(uri);
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
