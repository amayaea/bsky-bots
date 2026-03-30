import * as dotenv from "dotenv";
import * as path from "path";
import * as process from "process";
import { FantasyBballBot } from "./fantasyBballBot";

/** Each bot keeps secrets in `bots/<name>/.env` (adjacent to `package.json`, one level above `dist/`). */
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const main = async () => {
  await new FantasyBballBot().run();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
