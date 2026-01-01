import { BskyClient } from "@bsky-bots/common";
import { SpotifyClient } from "./spotifyClient";
import { FIELDS_FILTER, PLAYLIST_ID, HASHTAGS } from "./constants";
import { AppBskyEmbedExternal, RichText } from "@atproto/api";
import { PlaylistedTrack, SimplifiedArtist, Track } from "@spotify/web-api-ts-sdk";
import { MetatagsClient } from "./metatagsClient";
import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { BskyPost, SOTD } from "./types";

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
      "posts_no_replies",
    );

    const songsToPost: SOTD[] = this.findSongsToPost(tracks, authorFeed);
    songsToPost.forEach(async (sotd) => {
      const rt = this.mapSOTDToRichText(sotd);
      this.bsky.post(rt, await this.getTrackEmbed(sotd.track), sotd.date.toISOString());
    });
  }

  private findSongsToPost(
    playlistedTracks: PlaylistedTrack<Track>[],
    feedViewPosts: FeedViewPost[],
  ): SOTD[] {
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

    const currentYear = new Date().getFullYear();
    const startDate = new Date(Date.UTC(currentYear, 0, 1));
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    const songsToPost: SOTD[] = [];
    const alreadyPostedSongs = new Set<string>();
    const postsByDate = new Map<string, boolean>();

    posts.forEach((post) => {
      const isSOTDPost = this.isSOTDPost(post.text);

      if (isSOTDPost) {
        const songMatch = post.text.match(/Today's Song of the Day is (.+?) by (.+?)\./);
        if (songMatch) {
          const songName = songMatch[1].trim();
          const artistName = songMatch[2].trim();
          const songKey = `${songName.toLowerCase()} - ${artistName.toLowerCase()}`;
          alreadyPostedSongs.add(songKey);
        }

        const dateKey = `${post.createdAt.getFullYear()}-${post.createdAt.getMonth()}-${post.createdAt.getDate()}`;
        postsByDate.set(dateKey, true);
      }
    });

    for (let i = 0; i < tracks.length; i++) {
      const track = playlistedTracks[i];
      const targetDate = new Date(startDate);
      targetDate.setUTCDate(startDate.getUTCDate() + i);

      // Stop if target date is in the future
      if (targetDate > todayUTC) {
        console.log(
          `Reached current date (${this.formatDateUTC(todayUTC)}). Stopping search for future dates.`,
        );
        break;
      }

      console.log(
        `Checking song ${i + 1}: ${track.track.name} by ${track.track.artists[0].name} for date: ${this.formatDateUTC(targetDate)}`,
      );

      const dateKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`;
      const hasPostForDate = postsByDate.has(dateKey);

      const songKey = `${track.track.name.toLowerCase()} - ${track.track.artists[0].name.toLowerCase()}`;
      const songAlreadyPosted = alreadyPostedSongs.has(songKey);

      if (hasPostForDate) {
        console.log(`Post already exists for ${this.formatDateUTC(targetDate)}`);
        continue;
      }

      if (songAlreadyPosted) {
        console.log(
          `Song "${track.track.name}" by "${track.track.artists[0].name}" already posted on a different date, skipping`,
        );
        continue;
      }

      console.log(
        `No post found for ${this.formatDateUTC(targetDate)} and song hasn't been posted yet, adding to songs to post`,
      );
      songsToPost.push({
        track: track.track,
        date: targetDate,
      });
    }

    console.log(`Found ${songsToPost.length} songs that need to be posted:`);
    songsToPost.forEach(({ track, date }) => {
      console.log(`${this.formatDateUTC(date)}: ${track.name} by ${track.artists[0].name}`);
    });

    return songsToPost;
  }

  private mapSOTDToRichText = (sotd: SOTD): RichText => {
    const result = new RichText({
      text: `${this.formatDateUTC(sotd.date)}: Today's Song of the Day is ${sotd.track.name} by ${this.mapArtistsToText(sotd.track.artists)}. ${sotd.track.external_urls.spotify} ${HASHTAGS.join(" ")}`,
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

  private isSOTDPost = (postText: string): boolean => {
    return (
      postText.includes("Today's Song of the Day is") &&
      HASHTAGS.every((hashtag) => postText.includes(hashtag))
    );
  };

  private formatDateUTC = (date: Date): string => {
    return date.toLocaleDateString("en-US", { timeZone: "UTC" });
  };
}
