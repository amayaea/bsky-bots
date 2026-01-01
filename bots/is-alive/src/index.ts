import * as dotenv from "dotenv";
import * as process from "process";
import wiki from "wikipedia";
import axios from "axios";
import { BskyClient } from "@bsky-bots/common";

dotenv.config();
const userAgent = "bsky-bots/1.0 (https://github.com/amayaea/bsky-bots)";
wiki.setUserAgent(userAgent);
axios.defaults.headers.common["User-Agent"] = userAgent;

const person = "Joe Biden";
const gender = "he";

const main = async () => {
  const result = await getWikipedia();
  const bsky = new BskyClient(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
  await bsky.login();
  await post(bsky, result);
};

const getWikipedia = async (): Promise<boolean> => {
  try {
    const page = await wiki.page(person.replace(" ", "_"));
    const info = await page.infobox();
    return !Object.prototype.hasOwnProperty.call(info, "deathDate");
  } catch (error) {
    console.error("Error fetching Wikipedia page:", error);
    throw error;
  }
};

const post = async (bsky: BskyClient, result: boolean) => {
  const postText: string = result
    ? `Yes, ${person} is still alive.`
    : `No, ${person} is no longer alive. May ${gender} rest in peace.`;
  await bsky.postText(postText);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
