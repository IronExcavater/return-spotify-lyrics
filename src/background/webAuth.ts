import { AccessToken } from '@spotify/web-api-ts-sdk';
import {
    REDIRECT_PATH,
    SPOTIFY_AUTH_URL,
    SPOTIFY_CLIENT_ID,
    SPOTIFY_SCOPES,
    SPOTIFY_TOKEN_URL,
} from '../shared/config';
import { createPkcePair } from '../shared/pkce';
import {
    getFromStorage,
    mustGetFromStorage,
    setInStorage,
} from '../shared/storage';

const PKCE_VERIFIER_KEY = 'pkceVerifier';
const SPOTIFY_TOKEN_KEY = 'spotifyToken';

const EXPIRY_BUFFER_MS = 60_000;
let refreshTimer: number | undefined;

export interface SpotifyToken extends AccessToken {
    expires_by: number;
    scope: string;
}

export async function buildAuthUrl(): Promise<URL> {
    const { verifier, challenge } = await createPkcePair();

    await setInStorage(PKCE_VERIFIER_KEY, verifier);
    const redirectUri = chrome.identity.getRedirectURL(REDIRECT_PATH);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        scope: SPOTIFY_SCOPES,
    });

    const authUrl = new URL(SPOTIFY_AUTH_URL);
    authUrl.search = params.toString();

    return authUrl;
}

export function launchWebAuth(authUrl: URL): Promise<string> {
    console.log('[OAUTH] Opening WebAuthFlow:', authUrl.toString());

    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
            { url: authUrl.toString(), interactive: true },
            (redirectUrl) => {
                if (chrome.runtime.lastError)
                    return reject(new Error(chrome.runtime.lastError.message));

                if (!redirectUrl)
                    return reject(new Error('No redirect URL returned'));

                const responseParams = new URL(redirectUrl).searchParams;

                const error = responseParams.get('error');
                if (error) return reject(new Error(error));

                const code = responseParams.get('code');
                if (!code)
                    return reject(new Error('Missing authorization code'));

                resolve(code);
            }
        );
    });
}

export async function requestAccessToken(code: string): Promise<SpotifyToken> {
    const pkceVerifier = await mustGetFromStorage<string>(PKCE_VERIFIER_KEY);
    const redirectUri = chrome.identity.getRedirectURL(REDIRECT_PATH);

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            code_verifier: pkceVerifier,
        }),
    });

    const raw = (await response.json()) as SpotifyToken;
    if (!response.ok || !raw) throw new Error('Token exchange failed');

    const token: SpotifyToken = {
        ...raw,
        expires_by: Date.now() + raw.expires_in * 1000,
    };

    await setInStorage(SPOTIFY_TOKEN_KEY, token);
    return token;
}

export async function refreshAccessToken(
    refreshToken: string
): Promise<SpotifyToken> {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    const raw = (await response.json()) as SpotifyToken;
    if (!response.ok || !raw) throw new Error('Token exchange failed');

    const token: SpotifyToken = {
        ...raw,
        expires_by: Date.now() + raw.expires_in * 1000,
    };

    await setInStorage(SPOTIFY_TOKEN_KEY, token);
    return token;
}

export async function getAccessToken(): Promise<SpotifyToken | undefined> {
    let token = await getFromStorage<SpotifyToken>(SPOTIFY_TOKEN_KEY);

    if (token && Date.now() >= token.expires_by) {
        token = await refreshAccessToken(token.refresh_token);
    }

    return token;
}

function refreshClear() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;
}

function refreshSoon(token: SpotifyToken) {
    refreshClear();

    const delay = token.expires_by - Date.now() - EXPIRY_BUFFER_MS;

    refreshTimer = setTimeout(() => refreshNow(token), Math.max(0, delay));
}

async function refreshNow(token: SpotifyToken) {
    refreshSoon(await refreshAccessToken(token.refresh_token));
}

const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
) => {
    if (area === 'local' && changes.spotifyToken) {
        const next = changes.spotifyToken.newValue as SpotifyToken | undefined;
        if (next) refreshSoon(next);
        else refreshClear();
    }
};

chrome.storage.onChanged.addListener(listener);
