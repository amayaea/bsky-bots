import { RichText, AtpAgent, AppBskyEmbedExternal } from "@atproto/api";

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

  public async getAllPosts(actor: string, limit?: number) {
    const authorFeed = await this.agent.getAuthorFeed({
      actor,
      limit,
    });
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
}
