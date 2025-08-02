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
