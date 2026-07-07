import { useEffect, useState } from 'react';

import { SPOTIFY_SCOPES } from '../../shared/config';
import { SPOTIFY_TOKEN_KEY } from '../../shared/spotifyAuthState';
import { getFromStorage, onStorageChange } from '../../shared/storage';

type StoredToken = {
    scope?: string;
};

const parseScopes = (scope?: string) =>
    new Set((scope ?? '').split(' ').filter(Boolean));

export function useReauthGate() {
    const [missingScopes, setMissingScopes] = useState<string[]>([]);

    useEffect(() => {
        const updateFromToken = (token?: StoredToken) => {
            if (!token?.scope) {
                setMissingScopes([]);
                return;
            }
            const granted = parseScopes(token.scope);
            const missing = SPOTIFY_SCOPES.filter(
                (scope) => !granted.has(scope)
            );
            setMissingScopes(missing);
        };

        let cancelled = false;
        const unsubscribe = onStorageChange<StoredToken>(
            SPOTIFY_TOKEN_KEY,
            (next) => {
                updateFromToken(next);
            }
        );

        void (async () => {
            const token = await getFromStorage<StoredToken>(SPOTIFY_TOKEN_KEY);
            if (cancelled) return;

            updateFromToken(token);
        })();

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    return { missingScopes };
}
