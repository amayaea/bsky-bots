import { AtpAgent } from "@atproto/api";

export const login = async (username: string, password: string): Promise<AtpAgent> => {
  const agent = new AtpAgent({
    service: "https://bsky.social",
  });
  const u = process.env.ENV === "dev" ? process.env.TEST_BOT_USERNAME : username;
  const p = process.env.ENV === "dev" ? process.env.TEST_BOT_PASSWORD : password;
  await agent.login({ identifier: u!, password: p! });
  return agent;
};
