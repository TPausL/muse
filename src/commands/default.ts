import { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { TYPES } from "../types.js";
import { inject, injectable } from "inversify";
import Command from ".";
import AddQueryToQueue from "../services/add-query-to-queue.js";
import Config from "../services/config.js";

@injectable()
export default class implements Command {
  public readonly slashCommand = new SlashCommandBuilder()
    .setName("default")
    .setDescription("Play all the music on the web!");

  public requiresVC = true;

  private readonly queue: AddQueryToQueue;
  private readonly config: Config;

  constructor(
  @inject(TYPES.Services.AddQueryToQueue) queue: AddQueryToQueue,
    @inject(TYPES.Config) config: Config
  ) {
    this.queue = queue;
    this.config = config;
  }

  public async execute(interaction: ChatInputCommandInteraction) {
    if (!this.config.DEFAULT_PLAYLIST) {
      throw new Error("You didn't specify a playlist in your env file!");
    }

    await this.queue.addToQueue({
      interaction,
      query: this.config.DEFAULT_PLAYLIST,
      addToFrontOfQueue: true,
      shuffleAdditions: true,
      shouldSplitChapters: false
    });

    // Await interaction.reply('u betcha');
  }
}
