import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SPOTIFY_CLIENT_ID } from '../shared/config';
import { getAccessToken } from './webAuth';

let sdk: SpotifyApi | null = null;

export async function getSpotifySdk() {
    const token = await getAccessToken();
    if (!token) return undefined;

    if (!sdk) {
        sdk = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, token);
    }
    return sdk;
}
