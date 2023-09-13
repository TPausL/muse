import getYouTubeID from "get-youtube-id";
import { EmbedBuilder } from "discord.js";
import Player, {
  MediaSource,
  QueuedSong,
  SongMetadata,
  STATUS
} from "../services/player.js";
import getProgressBar from "./get-progress-bar.js";
import { prettyTime } from "./time.js";
import { truncate } from "./string.js";

const PAGE_SIZE = 10;

const getMaxSongTitleLength = (title: string) => {
  // eslint-disable-next-line no-control-regex
  const nonASCII = /[^\x00-\x7F]+/;
  return nonASCII.test(title) ? 28 : 48;
};

const getSongTitle = (
  { title, url, offset, source }: QueuedSong,
  shouldTruncate = false
) => {
  if (source === MediaSource.HLS) {
    return `[${title}](${url})`;
  }

  const cleanSongTitle = title.replace(/\[.*\]/, "").trim();

  const songTitle = shouldTruncate
    ? truncate(cleanSongTitle, getMaxSongTitleLength(cleanSongTitle))
    : cleanSongTitle;
  const youtubeId = url.length === 11 ? url : getYouTubeID(url) ?? "";

  return `[${songTitle}](https://www.youtube.com/watch?v=${youtubeId}${
    offset === 0 ? "" : "&t=" + String(offset)
  })`;
};

const getQueueInfo = (player: Player) => {
  const queueSize = player.queueSize();
  if (queueSize === 0) {
    return "-";
  }

  return queueSize === 1 ? "1 song" : `${queueSize} songs`;
};

const getPlayerUI = (player: Player) => {
  const song = player.getCurrent();

  if (!song) {
    return "";
  }

  const position = player.getPosition();
  const button = player.status === STATUS.PLAYING ? "⏹️" : "▶️";
  const progressBar = getProgressBar(15, position / song.length);
  const elapsedTime = song.isLive
    ? "live"
    : `${prettyTime(position)}/${prettyTime(song.length)}`;
  const loop = player.loopCurrentSong ? "🔁" : "";
  return `${button} ${progressBar} \`[${elapsedTime}]\` 🔉 ${loop}`;
};

export const buildAddedEmbed = ({
  newSongs
}: {
  newSongs: SongMetadata[];
  addToFrontOfQueue: boolean;
  extraMsg: string;
  player?: Player;
}): EmbedBuilder => {
  const message = new EmbedBuilder();

  message
    .setTitle(
      `Successfully added ${newSongs.length} title${
        newSongs.length > 1 ? "s" : ""
      } to the queue!`
    )
    .setColor("Green");
  if (newSongs.length > 1) {
    message
      .setDescription(
        `from playlist [${newSongs[0].playlist?.title ?? ""}](https://youtube.com/playlist?list=${newSongs[0].playlist?.source ?? ""})`
      )
      .setThumbnail(newSongs[0].playlist?.thumbnail);
  } else {
    message
      .setDescription(
        `[${newSongs[0].title}](https://youtube.com/watch?v=${newSongs[0].url})`
      )
      .setThumbnail(newSongs[0].thumbnailUrl);
  }

  return message;
};

export const buildPlayingMessageEmbed = (player: Player): EmbedBuilder => {
  const currentlyPlaying = player.getCurrent();

  if (!currentlyPlaying) {
    throw new Error("No playing song found");
  }

  const { thumbnailUrl, requestedBy } = currentlyPlaying;
  const message = new EmbedBuilder();
  message
    .setColor(player.status === STATUS.PLAYING ? "Aqua" : "DarkRed")
    .setTitle(player.status === STATUS.PLAYING ? "Now Playing" : "Paused")
    .setDescription(
      `
      **${getSongTitle(currentlyPlaying)}**
      Requested by: <@${requestedBy}>\n
      ${getPlayerUI(player)}
    `
    );

  if (thumbnailUrl) {
    message.setThumbnail(thumbnailUrl);
  }

  return message;
};

export const buildQueueEmbed = (player: Player, page: number): EmbedBuilder => {
  const currentlyPlaying = player.getCurrent();

  if (!currentlyPlaying) {
    throw new Error("queue is empty");
  }

  const queueSize = player.queueSize();
  const maxQueuePage = Math.ceil((queueSize + 1) / PAGE_SIZE);

  if (page > maxQueuePage) {
    throw new Error("the queue isn't that big");
  }

  const queuePageBegin = (page - 1) * PAGE_SIZE;
  const queuePageEnd = queuePageBegin + PAGE_SIZE;
  const queuedSongs = player
    .getQueue()
    .slice(queuePageBegin, queuePageEnd)
    .map((song, index) => {
      const songNumber = index + 1 + queuePageBegin;
      const duration = song.isLive ? "live" : prettyTime(song.length);

      return `\`${songNumber}.\` ${getSongTitle(song, true)} \`[${duration}]\``;
    })
    .join("\n");

  const { thumbnailUrl, requestedBy } = currentlyPlaying;
  const totalLength = player
    .getQueue()
    .reduce((accumulator, current) => accumulator + current.length, 0);

  const message = new EmbedBuilder();

  let description = `**${getSongTitle(currentlyPlaying)}**\n`;
  description += `Requested by: <@${requestedBy}>\n\n`;
  description += `${getPlayerUI(player)}\n\n`;

  if (player.getQueue().length > 0) {
    description += "**Up next:**\n";
    description += queuedSongs;
  }

  message
    .setTitle(
      player.status === STATUS.PLAYING
        ? `Now Playing ${player.loopCurrentSong ? "(loop on)" : ""}`
        : "Queued songs"
    )
    .setColor(player.status === STATUS.PLAYING ? "DarkGreen" : "NotQuiteBlack")
    .setDescription(description)
    .addFields([
      { name: "In queue", value: getQueueInfo(player), inline: true },
      {
        name: "Total length",
        value: `${totalLength > 0 ? prettyTime(totalLength) : "-"}`,
        inline: true
      },
      { name: "Page", value: `${page} out of ${maxQueuePage}`, inline: true }
    ]);

  if (thumbnailUrl) {
    message.setThumbnail(thumbnailUrl);
  }

  return message;
};

export const buildLyricsEmbed = (
  song: SongMetadata,
  lyrics: string
): EmbedBuilder => {
  const message = new EmbedBuilder();
  message
    .setTitle(`Lyrics for ${song.title}`)
    .setDescription(lyrics)
    .setColor("Aqua");
  return message;
};

export const buildSkipEmbed = (player: Player, n: number): EmbedBuilder => {
  const currentlyPlaying = player.getCurrent();
  if (!currentlyPlaying) {
    throw new Error("queue is empty");
  }

  const { requestedBy, thumbnailUrl } = currentlyPlaying;
  const message = new EmbedBuilder();
  if (n === 1) {
    message.setTitle("Skipped").setDescription(
      `
      **${getSongTitle(currentlyPlaying)}**
      Requested by: <@${requestedBy}>\n
    `
    ).setThumbnail(thumbnailUrl);
  } else {
    message.setTitle(`Skipped ${n} songs`);
  }

  message.setColor("Green");
  return message;
};

export const buildUnskipEmbed = (player: Player): EmbedBuilder => {
  const currentlyPlaying = player.getCurrent();
  if (!currentlyPlaying) {
    throw new Error("queue is empty");
  }

  const { requestedBy } = currentlyPlaying;
  const message = new EmbedBuilder();
  message.setTitle("Unskipped").setDescription(
    `
      **${getSongTitle(currentlyPlaying)}**
        Requested by: <@${requestedBy}>\n
    `
  ).setColor("Green")
    .setThumbnail(currentlyPlaying.thumbnailUrl);
  return message;
};
