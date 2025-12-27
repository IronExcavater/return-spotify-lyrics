import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPOTIFY_SCOPES } from '../../shared/config';
import { getFromStorage } from '../../shared/storage';

type StoredSpotifyToken = {
    scope?: string;
};

const SPOTIFY_TOKEN_KEY = 'spotifyToken';

function findMissingScopes(scope?: string) {
    const granted = new Set(
        (scope ?? '')
            .split(/\s+/)
            .map((s) => s.trim())
            .filter(Boolean)
    );

    return SPOTIFY_SCOPES.filter((required) => !granted.has(required));
}

export interface SpotifyReauthPrompt {
    missingScopes: string[];
    detectedAt: number;
    dismiss: () => void;
    reauthorize: () => void;
}

interface Options {
    authed: boolean | undefined;
    onReauthorize: () => void;
}

export function useSpotifyReauthPrompt({ authed, onReauthorize }: Options) {
    const reauthorizeRef = useRef(onReauthorize);
    const [prompt, setPrompt] = useState<SpotifyReauthPrompt | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const lastMissingKeyRef = useRef<string | null>(null);

    useEffect(() => {
        reauthorizeRef.current = onReauthorize;
    }, [onReauthorize]);

    const evaluate = useCallback(async () => {
        if (authed !== true) {
            setPrompt(null);
            setDismissed(false);
            lastMissingKeyRef.current = null;
            return;
        }

        const token =
            await getFromStorage<StoredSpotifyToken>(SPOTIFY_TOKEN_KEY);
        const missing = findMissingScopes(token?.scope);
        const missingKey = missing.join('|') || null;

        if (missingKey !== lastMissingKeyRef.current) {
            lastMissingKeyRef.current = missingKey;
            setDismissed(false);
        }

        if (missing.length > 0 && !dismissed) {
            setPrompt({
                missingScopes: missing,
                detectedAt: Date.now(),
                dismiss: () => setDismissed(true),
                reauthorize: () => reauthorizeRef.current?.(),
            });
        } else {
            setPrompt(null);
        }
    }, [authed, dismissed]);

    useEffect(() => {
        void evaluate();
    }, [evaluate]);

    useEffect(() => {
        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ) => {
            if (area === 'local' && changes.spotifyToken) {
                void evaluate();
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, [evaluate]);

    return useMemo(
        () => ({
            prompt,
        }),
        [prompt]
    );
}
