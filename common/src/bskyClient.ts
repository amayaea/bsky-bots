import { RichText, AtpAgent, AppBskyEmbedExternal } from "@atproto/api";
import { OutputSchema } from "@atproto/api/dist/client/types/com/atproto/repo/uploadBlob";

export class BskyClient {
  private agent: AtpAgent;
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    this.agent = new AtpAgent({
      service: "https://bsky.social",
    });
    this.username = username;
    this.password = password;
  }

  public async login(): Promise<void> {
    console.log(
      `Logging in with ${process.env.NODE_ENV === "dev" ? "dev" : "production"} credentials`,
    );
    const u = process.env.NODE_ENV === "dev" ? process.env.TEST_BOT_USERNAME : this.username;
    const p = process.env.NODE_ENV === "dev" ? process.env.TEST_BOT_PASSWORD : this.password;
    await this.agent.login({ identifier: u!, password: p! });
  }

  public getUsername(): string {
    return this.username;
  }

  public async getAllPosts(actor: string, limit?: number) {
    console.log(`Getting all posts for ${actor}`);
    const authorFeed = await this.agent.getAuthorFeed({
      actor,
      limit,
    });
    console.log(`Found ${authorFeed.data.feed.length} posts`);
    return authorFeed.data.feed;
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

  public async uploadBlob(blob: Blob): Promise<OutputSchema> {
    console.log("Uploading blob");
    const { data } = await this.agent.uploadBlob(blob, { encoding: "image/jpeg" });
    console.log("Successfully uploaded blob");
    return data;
  }
}
