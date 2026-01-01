import { Metatags } from "./types";

export class MetatagsClient {
  private METATAGS_API_PATH = "https://api.microlink.io?url";

  getMetatags = async (url: string): Promise<Metatags> => {
    console.log("Fetching metatags for", url);
    try {
      const req = await fetch(`${this.METATAGS_API_PATH}=${url}`);
      const response = await req.json();

      // Check if the API returned an error
      if (response.status !== "success" || !response.data) {
        console.error("API returned error:", response);
        throw new Error(
          `Metatags API error: ${response.status} - ${response.message || "Unknown error"}`,
        );
      }

      return {
        title: response.data.title,
        description: response.data.description,
        image: response.data.image.url,
      };
    } catch (error) {
      console.error("Failed to fetch metatags", error);
      throw error;
    }
  };
}
