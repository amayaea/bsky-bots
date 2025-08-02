import { RichText, AtpAgent, AppBskyEmbedExternal, AppBskyFeedGetPosts } from "@atproto/api";
import { OutputSchema } from "@atproto/api/dist/client/types/com/atproto/repo/uploadBlob";
import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

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

  public async post(rt: RichText, embed?: AppBskyEmbedExternal.Main) {
    console.log(`Posting "${rt.text}"`);
    await rt.detectFacets(this.agent);
    await this.agent.post({
      text: rt.text,
      facets: rt.facets,
      embed: embed,
    });
    console.log("Successfully Posted!");
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
      allPosts = [...allPosts, ...posts];

      cursor = response.data.cursor;
      hasMore = cursor !== undefined && posts.length === batchSize;
    }

    return allPosts;
  }

  public async uploadBlob(blob: Blob): Promise<OutputSchema> {
    console.log("Uploading blob");
    const { data } = await this.agent.uploadBlob(blob, { encoding: "image/jpeg" });
    console.log("Successfully uploaded blob");
    return data;
  }
}
