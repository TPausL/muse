import { inject, injectable } from "inversify";
import SpotifyWebApi from "spotify-web-api-node";
import Youtube from "youtube.ts";
import pRetry from "p-retry";
import { TYPES } from "../types.js";
import Config from "./config.js";
import { Client as GeniusClient } from "genius-lyrics";

@injectable()
export default class ThirdParty {
  readonly youtube: Youtube;
  readonly spotify: SpotifyWebApi;
  readonly genius: GeniusClient;

  private spotifyTokenTimerId?: NodeJS.Timeout;

  constructor(@inject(TYPES.Config) config: Config) {
    // Library is transpiled incorrectly
    // eslint-disable-next-line
    this.youtube = new (Youtube as any).default(config.YOUTUBE_API_KEY);
    this.spotify = new SpotifyWebApi({
      clientId: config.SPOTIFY_CLIENT_ID,
      clientSecret: config.SPOTIFY_CLIENT_SECRET
    });
    this.genius = new GeniusClient(config.GENIUS_TOKEN);

    void this.refreshSpotifyToken();
  }

  cleanup() {
    if (this.spotifyTokenTimerId) {
      clearTimeout(this.spotifyTokenTimerId);
    }
  }

  private async refreshSpotifyToken() {
    await pRetry(
      async () => {
        const auth = await this.spotify.clientCredentialsGrant();
        this.spotify.setAccessToken(auth.body.access_token);
        this.spotifyTokenTimerId = setTimeout(
          this.refreshSpotifyToken.bind(this),
          (auth.body.expires_in / 2) * 1000
        );
      },
      { retries: 5 }
    );
  }
}
