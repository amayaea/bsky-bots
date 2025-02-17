import * as dotenv from "dotenv";
import * as process from "process";
import { BskyClient } from "@bsky-bots/common";
import { SpotifyClient } from "./spotifyClient";
import { FIELDS_FILTER, PLAYLIST_ID, TEST_BOT_HANDLE } from "./constants";
import { mapTrackToRichText } from "./utils";

dotenv.config();

const main = async () => {
  const spotify = new SpotifyClient(
    process.env.SPOTIFY_CLIENT_ID!,
    process.env.SPOTIFY_CLIENT_SECRET!,
  );
  const bsky = new BskyClient(process.env.BLUESKY_USERNAME!, process.env.BLUESKY_PASSWORD!);
  await bsky.login();

  const tracks = await spotify.getTracks(PLAYLIST_ID, FIELDS_FILTER);
  const track = tracks[0].track;
  const posts = await bsky.getAllPosts(TEST_BOT_HANDLE, 3);
  console.log(JSON.stringify(posts, null, 2));
  const rt = mapTrackToRichText(track);
  bsky.post(rt);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
