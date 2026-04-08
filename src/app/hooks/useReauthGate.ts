import { useEffect, useMemo, useState } from 'react';

import { SPOTIFY_SCOPES } from '../../shared/config';
import { getFromStorage, onStorageChange } from '../../shared/storage';

type StoredToken = {
    scope?: string;
};

type ReauthReason = 'missing-scopes';

const TOKEN_KEY = 'spotifyToken';

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
        const unsubscribe = onStorageChange<StoredToken>(TOKEN_KEY, (next) => {
            updateFromToken(next);
        });

        void (async () => {
            const token = await getFromStorage<StoredToken>(TOKEN_KEY);
            if (cancelled) return;

            updateFromToken(token);
        })();

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const reasons = useMemo<ReauthReason[]>(
        () => (missingScopes.length > 0 ? ['missing-scopes'] : []),
        [missingScopes]
    );
    const needsReauth = reasons.length > 0;

    return { needsReauth, reasons, missingScopes };
}
