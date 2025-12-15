import { AtpAgent } from "@atproto/api";
import * as dotenv from "dotenv";
import * as process from "process";
import wiki from "wikipedia";
import axios from "axios";
import { login } from "@bsky-bots/common";

dotenv.config();
const userAgent = "bsky-bots/1.0 (https://github.com/amayaea/bsky-bots)";
wiki.setUserAgent(userAgent);
axios.defaults.headers.common["User-Agent"] = userAgent;

const main = async () => {
  const result = await getWikipedia();
  const agent = await login(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
  post(agent, result);
};

const getWikipedia = async (): Promise<boolean> => {
  try {
    const page = await wiki.page("Virginia_Halas_McCaskey");
    const info = await page.infobox();
    return !Object.prototype.hasOwnProperty.call(info, "deathDate");
  } catch (error) {
    console.error("Error fetching Wikipedia page:", error);
    throw error;
  }
};

const post = async (agent: AtpAgent, result: boolean) => {
  const post: string = result
    ? "Yes, Virginia McCaskey is still alive."
    : "No, Virginia McCaskey is no longer alive. May she rest in peace.";
  console.log(`Posting "${post}"`);
  await agent.post({
    text: post,
  });
  console.log("Successfully Posted!");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
