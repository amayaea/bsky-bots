import * as dotenv from "dotenv";
import * as process from "process";
import { SotdBot } from "./sotdBot";

dotenv.config();

const main = async () => {
  await new SotdBot().run();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
