import { RichText, AtpAgent, AppBskyEmbedExternal, AppBskyFeedGetPosts } from "@atproto/api";
import { OutputSchema } from "@atproto/api/dist/client/types/com/atproto/repo/uploadBlob";
import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

interface BskyPost {
  $type: "app.bsky.feed.post";
  text: string;
  createdAt: string;
}

export class BskyClient {
  private agent: AtpAgent;
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    this.agent = new AtpAgent({
      service: "https://bsky.social",
    });
    this.username = process.env.NODE_ENV === "dev" ? process.env.TEST_BOT_USERNAME! : username!;
    this.password = process.env.NODE_ENV === "dev" ? process.env.TEST_BOT_PASSWORD! : password!;
  }

  public async login(): Promise<void> {
    console.log(
      `Logging in with ${process.env.NODE_ENV === "dev" ? "dev" : "production"} credentials`,
    );
    await this.agent.login({ identifier: this.username, password: this.password });
  }

  public getUsername(): string {
    return this.username;
  }

  public async post(rt: RichText, embed?: AppBskyEmbedExternal.Main, createdAt?: string) {
    console.log(`Posting "${rt.text}"`);
    await rt.detectFacets(this.agent);
    await this.agent.post({
      text: rt.text,
      facets: rt.facets,
      embed: embed,
      createdAt,
    });
    console.log("Successfully Posted!");
  }

  public async postText(text: string) {
    console.log(`Posting "${text}"`);
    await this.agent.post({
      text,
    });
  }

  public async getPosts(uris: string[]): Promise<AppBskyFeedGetPosts.Response> {
    return await this.agent.getPosts({ uris });
  }

  public async getWholeAuthorFeed(actor: string, filter?: string): Promise<FeedViewPost[]> {
    console.log(`Getting entire author feed for ${actor}`);
    let allPosts: FeedViewPost[] = [];
    let cursor: string | undefined = undefined;
    const batchSize = 100;

    let hasMore = true;
    while (hasMore) {
      const response = await this.agent.getAuthorFeed({
        actor,
        limit: batchSize,
        cursor,
        filter,
      });

      const posts = response.data.feed;
      allPosts = [...posts, ...allPosts];

      cursor = response.data.cursor;
      hasMore = cursor !== undefined && posts.length === batchSize;
    }

    console.log(`Completed fetching entire feed for ${actor}, total posts: ${allPosts.length}`);
    return allPosts.sort((a, b) => {
      const dateA = new Date((a.post.record as BskyPost).createdAt);
      const dateB = new Date((b.post.record as BskyPost).createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  }

  public async uploadBlob(blob: Blob): Promise<OutputSchema> {
    console.log("Uploading blob");
    const { data } = await this.agent.uploadBlob(blob, { encoding: "image/jpeg" });
    console.log("Successfully uploaded blob");
    return data;
  }
}
