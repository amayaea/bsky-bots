import { RichText } from "@atproto/api";
import * as dotenv from "dotenv";
import * as process from "process";
import wiki from "wikipedia";
import { BskyClient } from "@bsky-bots/common";

dotenv.config();

const main = async () => {
  const result = await getWikipedia();
  const bsky = new BskyClient(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
  await bsky.login();
  bsky.post(
    new RichText({
      text: getPostText(result),
    }),
  );
};

const getWikipedia = async (): Promise<boolean> => {
  const page = await wiki.page("Virginia_Halas_McCaskey");
  const info = await page.infobox();
  return !Object.prototype.hasOwnProperty.call(info, "deathDate");
};

const getPostText = (result: boolean): string => {
  return result
    ? "Yes, Virginia McCaskey is still alive."
    : "No, Virginia McCaskey is no longer alive. May she rest in peace.";
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
