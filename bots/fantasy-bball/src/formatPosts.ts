import type { BskyClient } from "@bsky-bots/common";

/** Stay under Bluesky’s grapheme limit with buffer. */
export const MAX_GRAPHEME = 280;

/** Chunk by Unicode code points (close to Bluesky grapheme limits; conservative max). */
export function splitIntoThreadChunks(fullText: string, max = MAX_GRAPHEME): string[] {
  const codePoints = [...fullText];
  const chunks: string[] = [];
  let current = "";
  for (const ch of codePoints) {
    const trial = current + ch;
    if ([...trial].length > max && current.length > 0) {
      chunks.push(current);
      current = ch;
    } else {
      current = trial;
    }
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

export async function postThread(bsky: BskyClient, fullText: string): Promise<void> {
  const chunks = splitIntoThreadChunks(fullText);
  if (chunks.length === 0) {
    return;
  }
  const root = await bsky.postTextWithRef(chunks[0]!);
  let parent = { uri: root.uri, cid: root.cid };
  for (let i = 1; i < chunks.length; i++) {
    const next = await bsky.postTextReply(chunks[i]!, parent, root);
    parent = { uri: next.uri, cid: next.cid };
  }
}
