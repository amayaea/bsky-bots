import { Metatags } from "./types";

export class MetatagsClient {
  private DUB_METATAGS_API_PATH = "https://api.microlink.io?url";
  getMetatags = async (url: string): Promise<Metatags> => {
    console.log("Fetching metatags for ", url);
    try {
      const req = await fetch(`${this.DUB_METATAGS_API_PATH}=${url}`);
      const response = await req.json();
      console.log("Fetched metatags for ", url);

      return {
        title: response.data.title,
        description: response.data.description,
        image: response.data.image.url,
      };
    } catch (error) {
      console.error("Failed to fetch metatags:", error);
      throw error;
    }
  };
}
