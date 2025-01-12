import { AtpAgent } from "@atproto/api";
import * as dotenv from "dotenv";
import * as process from "process";
import wiki from "wikipedia";

dotenv.config();

const agent = new AtpAgent({
  service: "https://bsky.social",
});

const main = async () => {
  const result = await getWikipedia();
  const agent = await login();
  post(agent, result);
};

const getWikipedia = async (): Promise<boolean> => {
  const page = await wiki.page("Virginia_Halas_McCaskey");
  const info = await page.infobox();
  return !info.hasOwnProperty("deathDate");
};

const login = async (): Promise<AtpAgent> => {
  const username =
    process.env.ENV === "dev"
      ? process.env.TEST_BOT_USERNAME
      : process.env.BLUESKY_USERNAME;
  const password =
    process.env.ENV === "dev"
      ? process.env.TEST_BOT_PASSWORD
      : process.env.BLUESKY_PASSWORD;
  await agent.login({ identifier: username!, password: password! });
  return agent;
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
