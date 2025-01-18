import { AtpAgent } from "@atproto/api";
import * as dotenv from "dotenv";
import * as process from "process";
import wiki from "wikipedia";
import { login } from "common";

dotenv.config();

const main = async () => {
  const result = await getWikipedia();
  const agent = await login(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
  post(agent, result);
};

const getWikipedia = async (): Promise<boolean> => {
  const page = await wiki.page("Virginia_Halas_McCaskey");
  const info = await page.infobox();
  return !Object.prototype.hasOwnProperty.call(info, "deathDate");
};

const post = async (agent: AtpAgent, result: boolean) => {
  const post: string = result
    ? "Yes, Virginia McCaskey is still alive."
    : "No, Virginia McCaskey is no longer alive.";
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
