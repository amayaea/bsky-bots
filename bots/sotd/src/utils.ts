import { RichText } from "@atproto/api";
import { SimplifiedArtist, Track } from "@spotify/web-api-ts-sdk";

export const mapTrackToRichText = (track: Track): RichText => {
  const result = new RichText({
    text: `Today's Song of the Day is ${track.name} by ${mapArtistsToText(track.artists)}.\n
    ${track.external_urls.spotify}`,
  });
  return result;
};

const mapArtistsToText = (artists: SimplifiedArtist[]): string => {
  return artists.map((artist) => artist.name).join(", ");
};
