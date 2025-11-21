import { addOnMessage, Msg } from '../shared/messaging';
import {
    buildAuthUrl,
    getAccessToken,
    launchWebAuth,
    requestAccessToken,
} from './webAuth';
import { SPOTIFY_API_URL } from '../shared/config';
import { SpotifyProfile } from '../shared/types';
import { removeInStorage } from '../shared/storage';

addOnMessage(Msg.LOGIN_SPOTIFY, async () => {
    const authUrl = await buildAuthUrl();
    const code = await launchWebAuth(authUrl);
    return await requestAccessToken(code);
});

addOnMessage(Msg.LOGOUT_SPOTIFY, async () => {
    await removeInStorage('spotifyToken')
});

addOnMessage(Msg.GET_PROFILE, async () => {
    const token = await getAccessToken();
    if (!token) return undefined;

    return await fetchSpotify<SpotifyProfile>('/me', token.access_token);
});

async function fetchSpotify<T>(
    path: string,
    token: string,
    init: RequestInit = {}
) {
    const resp = await fetch(`${SPOTIFY_API_URL}${path}`, {
        ...init,
        headers: {
            ...init.headers,
            Authorization: `Bearer ${token}`,
        },
    });
    return resp.ok ? ((await resp.json()) as T) : null;
}
