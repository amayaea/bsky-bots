import { Track } from "@spotify/web-api-ts-sdk";

export type Metatags = {
  title: string;
  description: string;
  image: string;
};

export type BskyPost = {
  $type: "app.bsky.feed.post";
  text: string;
  createdAt: string;
};

export type SOTD = {
  track: Track;
  date: Date;
};
