import { Client } from "genius-lyrics";
import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import ThirdParty from "./third-party";

@injectable()
export default class {
  private readonly genius: Client;

  constructor(@inject(TYPES.ThirdParty) thirdParty: ThirdParty) {
    this.genius = thirdParty.genius;
  }

  public async getLyrics({
    title
  }: {
    title: string;
    artist?: string;
  }): Promise<string> {
    return (await this.genius.songs.search(title))[0].lyrics();
  }
}
