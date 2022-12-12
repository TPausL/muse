import { ChatInputCommandInteraction } from "discord.js";
import { TYPES } from "../types.js";
import { inject, injectable } from "inversify";
import PlayerManager from "../managers/player.js";
import Command from ".";
import { SlashCommandBuilder } from "@discordjs/builders";
import { STATUS } from "../services/player";
import LyricsService from "../services/lyrics.js";

@injectable()
export default class implements Command {
  public readonly slashCommand = new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("get the lyrics the current song");

  public requiresVC = true;

  private readonly playerManager: PlayerManager;
  private readonly lyrics: LyricsService;

  constructor(
  @inject(TYPES.Managers.Player) playerManager: PlayerManager,
    @inject(TYPES.Services.LyricsService) lyrics: LyricsService
  ) {
    this.playerManager = playerManager;
    this.lyrics = lyrics;
  }

  public async execute(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const player = this.playerManager.get(interaction.guild!.id);

    if (player.status === STATUS.IDLE) {
      throw new Error("no song is currently playing!");
    }

    await this.lyrics.songLyrics({ interaction });
  }
}
