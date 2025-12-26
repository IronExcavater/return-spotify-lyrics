import { useCallback, useEffect, useMemo, useState } from 'react';
import { SPOTIFY_SCOPES } from '../../shared/config';
import { getFromStorage } from '../../shared/storage';

const SPOTIFY_TOKEN_KEY = 'spotifyToken';

type StoredSpotifyToken = {
    scope?: string;
};

const parseScopes = (scope?: string) =>
    scope
        ?.split(' ')
        .map((value) => value.trim())
        .filter(Boolean) ?? [];

export function useSpotifyReauthPrompt(authed?: boolean) {
    const [tokenScopes, setTokenScopes] = useState<string[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const [ready, setReady] = useState(false);

    const refreshScopes = useCallback((scope?: string) => {
        setTokenScopes(parseScopes(scope));
    }, []);

    useEffect(() => {
        let active = true;

        getFromStorage<StoredSpotifyToken>(SPOTIFY_TOKEN_KEY).then((token) => {
            if (!active) return;
            refreshScopes(token?.scope);
            setReady(true);
        });

        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ) => {
            if (area !== 'local' || !changes.spotifyToken) return;
            const next = changes.spotifyToken.newValue as
                | StoredSpotifyToken
                | undefined;
            refreshScopes(next?.scope);
            setReady(true);
        };

        chrome.storage.onChanged.addListener(listener);

        return () => {
            active = false;
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [refreshScopes]);

    const missingScopes = useMemo(() => {
        const existing = new Set(tokenScopes);
        return SPOTIFY_SCOPES.filter((scope) => !existing.has(scope));
    }, [tokenScopes]);

    const needsReauth =
        Boolean(authed) && ready && missingScopes.length > 0 && !dismissed;

    useEffect(() => {
        if (missingScopes.length === 0) {
            setDismissed(false);
        }
    }, [missingScopes.length]);

    useEffect(() => {
        if (!authed) {
            setDismissed(false);
        }
    }, [authed]);

    const dismiss = useCallback(() => {
        setDismissed(true);
    }, []);

    return {
        missingScopes,
        needsReauth,
        dismiss,
    };
}
