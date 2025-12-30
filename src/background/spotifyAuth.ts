import {
    AccessToken,
    AuthenticationResponse,
    SpotifyApi,
} from '@spotify/web-api-ts-sdk';
import {
    SPOTIFY_AUTH_URL,
    SPOTIFY_CLIENT_ID,
    SPOTIFY_REDIRECT,
    SPOTIFY_SCOPES,
    SPOTIFY_TOKEN_URL,
} from '../shared/config.ts';
import { createPkcePair } from '../shared/pkce.ts';
import {
    getFromStorage,
    mustGetFromStorage,
    removeInStorage,
    setInStorage,
} from '../shared/storage.ts';

const PKCE_VERIFIER_KEY = 'pkceVerifier';
const SPOTIFY_TOKEN_KEY = 'spotifyToken';
const EXPIRY_BUFFER_MS = 60_000;
const SPOTIFY_SCOPE_STRING = SPOTIFY_SCOPES.join(' ');

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let sdk: SpotifyApi | null = null;
let refreshInFlight: Promise<SpotifyToken> | null = null;

export interface SpotifyToken extends AccessToken {
    expires_by: number;
    scope: string;
}

export async function getSpotifySdk() {
    const token = await getAccessToken();
    if (!token) return undefined;

    if (!sdk) {
        sdk = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, token);
    }
    return sdk;
}

export async function buildAuthUrl(): Promise<URL> {
    const { verifier, challenge } = await createPkcePair();

    await setInStorage(PKCE_VERIFIER_KEY, verifier);
    const redirectUri = chrome.identity.getRedirectURL(SPOTIFY_REDIRECT);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        scope: SPOTIFY_SCOPE_STRING,
    });

    const authUrl = new URL(SPOTIFY_AUTH_URL);
    authUrl.search = params.toString();

    return authUrl;
}

export function launchWebAuth(authUrl: URL): Promise<string> {
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
    const redirectUri = chrome.identity.getRedirectURL(SPOTIFY_REDIRECT);

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: pkceVerifier,
        }),
    });

    const raw = (await response.json()) as AccessToken;
    if (!response.ok || !raw) throw new Error('Token exchange failed');

    const token = withExpiry(raw);

    await removeInStorage(PKCE_VERIFIER_KEY);
    await setInStorage(SPOTIFY_TOKEN_KEY, token);
    refreshSoon(token);
    sdk = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, token);
    return token;
}

export async function refreshAccessToken(
    refreshToken: string
): Promise<SpotifyToken> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        const prevToken = await getFromStorage<SpotifyToken>(SPOTIFY_TOKEN_KEY);

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

        let raw: AccessToken | { error?: string } | undefined;
        try {
            raw = (await response.json()) as typeof raw;
        } catch {
            raw = undefined;
        }

        if (!response.ok || !raw || !('access_token' in raw)) {
            const errorCode =
                raw && 'error' in raw ? raw.error : 'token exchange failed';

            if (errorCode === 'invalid_grant') {
                await clearSpotifySession();
            }

            throw new Error(
                typeof errorCode === 'string'
                    ? errorCode
                    : 'Token exchange failed'
            );
        }

        const token: SpotifyToken = withExpiry({
            ...raw,
            refresh_token: raw.refresh_token ?? refreshToken,
            scope: raw.scope ?? prevToken?.scope ?? SPOTIFY_SCOPE_STRING,
        });

        await setInStorage(SPOTIFY_TOKEN_KEY, token);
        refreshSoon(token);
        sdk = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, token);
        return token;
    })();

    try {
        return await refreshInFlight;
    } finally {
        refreshInFlight = null;
    }
}

export async function getAccessToken(): Promise<SpotifyToken | undefined> {
    let token = await getFromStorage<SpotifyToken>(SPOTIFY_TOKEN_KEY);

    if (token && Date.now() >= token.expires_by) {
        try {
            token = await refreshAccessToken(token.refresh_token);
        } catch (err) {
            console.warn('[spotifyAuth] Token refresh failed', err);
            await clearSpotifySession();
            return undefined;
        }
    } else if (token) {
        refreshSoon(token);
    }

    return token;
}

function withExpiry(token: AccessToken & { scope?: string }): SpotifyToken {
    const expiresAt = Date.now() + token.expires_in * 1000;
    return {
        ...token,
        expires_by: expiresAt - EXPIRY_BUFFER_MS,
        expires: expiresAt,
        scope: token.scope ?? SPOTIFY_SCOPE_STRING,
    };
}

function refreshClear() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;
}

function refreshSoon(token: SpotifyToken) {
    refreshClear();

    const delay = token.expires_by - Date.now();
    refreshTimer = setTimeout(() => refreshNow(token), Math.max(0, delay));
}

async function refreshNow(token: SpotifyToken) {
    try {
        const latest =
            (await getFromStorage<SpotifyToken>(SPOTIFY_TOKEN_KEY)) ?? token;
        await refreshAccessToken(latest.refresh_token);
    } catch (err) {
        console.warn('[spotifyAuth] Failed to refresh token', err);
    }
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

export async function authenticate(): Promise<AuthenticationResponse> {
    const authUrl = await buildAuthUrl();
    const code = await launchWebAuth(authUrl);
    const token = await requestAccessToken(code);

    return {
        authenticated: token.expires > Date.now(),
        accessToken: token,
    };
}

export async function clearSpotifySession() {
    refreshClear();
    sdk = null;
    await removeInStorage(SPOTIFY_TOKEN_KEY);
}
