import { Metatags } from "./types";

export class DubClient {
  private DUB_METATAGS_API_PATH = "https://api.dub.co/metatags?url";

  getMetatags = async (url: string): Promise<Metatags> => {
    console.log("Fetching metatags for", url);
    try {
      const req = await fetch(`${this.DUB_METATAGS_API_PATH}=${url}`);
      const metadata = await req.json();
      console.log("Fetched metatags for ", url, metadata);

      return metadata;
    } catch (error) {
      console.error("Failed to fetch metatags:", error);
      throw error;
    }
  };
}
