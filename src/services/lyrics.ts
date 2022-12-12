import { ChatInputCommandInteraction } from "discord.js";
import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import GeniusAPI from "../services/genius-api";
import PlayerManager from "../managers/player.js";
import { buildLyricsEmbed } from "../utils/build-embed";
import { SongMetadata } from "./player";

@injectable()
export default class {
  private readonly geniusAPI: GeniusAPI;
  private readonly playerManager: PlayerManager;

  constructor(
  @inject(TYPES.Services.GeniusAPI) geniusAPI: GeniusAPI,
    @inject(TYPES.Managers.Player) playerManager: PlayerManager
  ) {
    this.geniusAPI = geniusAPI;
    this.playerManager = playerManager;
  }

  public async songLyrics({
    interaction
  }: {
    interaction: ChatInputCommandInteraction;
  }) {
    const player = this.playerManager.get(interaction.guild!.id);
    const current = player.getCurrent();
    const text = await this.geniusAPI.getLyrics({
      title: current!.title,
      artist: current?.artist
    });

    return interaction.reply({
      embeds: [buildLyricsEmbed(current as SongMetadata, text)]
    });
  }
}
