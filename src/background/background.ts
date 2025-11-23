import { addOnMessage, Msg } from '../shared/messaging';
import {
    buildAuthUrl,
    getAccessToken,
    launchWebAuth,
    requestAccessToken,
} from './webAuth';
import { SPOTIFY_API_URL } from '../shared/config';
import { removeInStorage } from '../shared/storage';
import { PlaybackState, User } from '@spotify/web-api-ts-sdk';

addOnMessage(Msg.LOGIN_SPOTIFY, async () => {
    const authUrl = await buildAuthUrl();
    const code = await launchWebAuth(authUrl);
    return await requestAccessToken(code);
});

addOnMessage(Msg.LOGOUT_SPOTIFY, async () => {
    await removeInStorage('spotifyToken');
});

addOnMessage(Msg.GET_PROFILE, async () => {
    const token = await getAccessToken();
    if (!token) return undefined;

    return await fetchSpotify<User>('/me', token.access_token);
});

addOnMessage(Msg.GET_PLAYER, async () => {
    const token = await getAccessToken();
    if (!token) return undefined;

    return await fetchSpotify<PlaybackState>('/me/player', token.access_token);
});

addOnMessage(Msg.PLAYER_PLAY, async () => {
    const token = await getAccessToken();
    if (!token) return undefined;

    return await fetchSpotify('/me/player/play', token.access_token, {
        method: 'PUT',
    });
});

addOnMessage(Msg.PLAYER_PAUSE, async () => {
    const token = await getAccessToken();
    if (!token) return undefined;

    return await fetchSpotify('/me/player/pause', token.access_token, {
        method: 'PUT',
    });
});

addOnMessage(Msg.PLAYER_NEXT, async () => {
    const token = await getAccessToken();
    if (!token) return undefined;

    return await fetchSpotify('/me/player/next', token.access_token, {
        method: 'POST',
    });
});

addOnMessage(Msg.PLAYER_PREVIOUS, async () => {
    const token = await getAccessToken();
    if (!token) return undefined;

    return await fetchSpotify('/me/player/previous', token.access_token, {
        method: 'POST',
    });
});

async function fetchSpotify<T>(
    path: string,
    token: string,
    init: RequestInit = {}
): Promise<T | undefined> {
    const resp = await fetch(`${SPOTIFY_API_URL}${path}`, {
        ...init,
        headers: {
            ...init.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (resp.status !== 200 && resp.status !== 201) return undefined;

    const text = await resp.text();
    if (!text) return undefined;

    return JSON.parse(text) as T;
}
