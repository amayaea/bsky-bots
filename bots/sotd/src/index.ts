import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import * as dotenv from "dotenv";
import * as process from "process";

dotenv.config();

const main = async () => {
  const api = getSpotifyApi();
  const items = await api.search("The Beatles", ["artist"]);
  console.table(
    items.artists.items.map((item) => ({
      name: item.name,
      followers: item.followers.total,
      popularity: item.popularity,
    })),
  );
};

const getSpotifyApi = (): SpotifyApi => {
  return SpotifyApi.withClientCredentials(
    process.env.SPOTIFY_CLIENT_ID as string,
    process.env.SPOTIFY_CLIENT_SECRET as string,
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
