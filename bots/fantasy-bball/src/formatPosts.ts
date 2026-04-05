import type { BskyClient } from "@bsky-bots/common";

/** Stay under Bluesky’s grapheme limit with buffer. */
export const MAX_GRAPHEME = 280;

/** Chunk by lines, staying under Bluesky’s grapheme limit. */
export function splitIntoThreadChunks(fullText: string, max = MAX_GRAPHEME): string[] {
  const lines = fullText.split("\n");
  const chunks: string[] = [];
  let currentChunkLines: string[] = [];
  let currentChunkGraphemes = 0;

  for (const line of lines) {
    const lineGraphemes = [...line].length;

    // If a single line is too long, we must split it char-by-char to avoid API errors.
    if (lineGraphemes > max) {
      if (currentChunkLines.length > 0) {
        chunks.push(currentChunkLines.join("\n"));
        currentChunkLines = [];
        currentChunkGraphemes = 0;
      }

      // Split this specific long line char-by-char
      let subChunk = "";
      for (const ch of [...line]) {
        if ([...(subChunk + ch)].length > max) {
          chunks.push(subChunk);
          subChunk = ch;
        } else {
          subChunk += ch;
        }
      }
      if (subChunk) chunks.push(subChunk);
      continue;
    }

    const separator = currentChunkLines.length > 0 ? 1 : 0; // "\n"
    if (currentChunkGraphemes + separator + lineGraphemes > max) {
      chunks.push(currentChunkLines.join("\n"));
      currentChunkLines = [line];
      currentChunkGraphemes = lineGraphemes;
    } else {
      currentChunkLines.push(line);
      currentChunkGraphemes += separator + lineGraphemes;
    }
  }

  if (currentChunkLines.length > 0) {
    chunks.push(currentChunkLines.join("\n"));
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
