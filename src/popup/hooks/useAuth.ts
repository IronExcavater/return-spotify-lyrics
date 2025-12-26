import { useEffect, useRef, useState } from 'react';
import { UserProfile } from '@spotify/web-api-ts-sdk';
import { Msg, sendMessage, sendSpotifyMessage } from '../../shared/messaging';
import { getFromStorage, setInStorage } from '../../shared/storage';

const SPOTIFY_USER_KEY = 'spotifyUser';
const SPOTIFY_CONNECTION_KEY = 'spotifyConnectionMeta';
const SPOTIFY_TOKEN_KEY = 'spotifyToken';
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 400;

export interface SpotifyConnectionMeta {
    userId: string;
    connectedAt: number;
    lastActiveAt: number;
    sessionCount: number;
}

export function useAuth() {
    const [authed, setAuthed] = useState<boolean | undefined>(undefined);
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<UserProfile | undefined>(undefined);
    const [connection, setConnection] = useState<
        SpotifyConnectionMeta | undefined
    >(undefined);
    const connectionRef = useRef<SpotifyConnectionMeta | undefined>(undefined);
    const sessionActiveRef = useRef(false);
    const retryRef = useRef<number | null>(null);
    const retryCountRef = useRef(0);

    const clearRetry = () => {
        if (retryRef.current) {
            window.clearTimeout(retryRef.current);
            retryRef.current = null;
        }
    };

    const sync = async () => {
        try {
            const resp = await sendSpotifyMessage('currentUser');
            const isAuthed = resp != null;
            setAuthed(isAuthed);
            setUser(resp);
            void setInStorage<UserProfile>(SPOTIFY_USER_KEY, resp);

            if (resp) {
                const prev = connectionRef.current;
                const sameUser = prev?.userId === resp.id;
                const now = Date.now();
                const baseSessions = sameUser ? (prev?.sessionCount ?? 0) : 0;
                const nextSessions = Math.max(
                    1,
                    !sessionActiveRef.current || !sameUser
                        ? baseSessions + 1
                        : baseSessions
                );

                const nextMeta: SpotifyConnectionMeta = {
                    userId: resp.id,
                    connectedAt:
                        sameUser && prev?.connectedAt ? prev.connectedAt : now,
                    lastActiveAt: now,
                    sessionCount: nextSessions,
                };

                connectionRef.current = nextMeta;
                setConnection(nextMeta);
                sessionActiveRef.current = true;
                void setInStorage(SPOTIFY_CONNECTION_KEY, nextMeta);
            } else {
                sessionActiveRef.current = false;
            }
            setReady(true);
            retryCountRef.current = 0;
            clearRetry();
        } catch (error) {
            console.warn('[auth] Failed to sync Spotify user', error);
            const token = await getFromStorage(SPOTIFY_TOKEN_KEY);
            if (!token) {
                setAuthed(false);
                setUser(undefined);
                sessionActiveRef.current = false;
                setReady(true);
                retryCountRef.current = 0;
                clearRetry();
                return;
            }

            if (retryCountRef.current < RETRY_LIMIT) {
                retryCountRef.current += 1;
                clearRetry();
                retryRef.current = window.setTimeout(
                    () => void sync(),
                    RETRY_DELAY_MS * retryCountRef.current
                );
            } else {
                setAuthed(false);
                setUser(undefined);
                sessionActiveRef.current = false;
                setReady(true);
                retryCountRef.current = 0;
                clearRetry();
            }
        }
    };

    const login = () => {
        void sendMessage({ type: Msg.LOGIN_SPOTIFY });
    };

    const logout = () => {
        void sendMessage({ type: Msg.LOGOUT_SPOTIFY });
    };

    // React to token changes in chrome storage
    useEffect(() => {
        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ) => {
            if (area === 'local' && changes.spotifyToken) {
                retryCountRef.current = 0;
                clearRetry();
                void sync();
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // Initial auth sync
    useEffect(() => {
        getFromStorage<UserProfile>(SPOTIFY_USER_KEY, (user) => setUser(user));
        getFromStorage<SpotifyConnectionMeta>(
            SPOTIFY_CONNECTION_KEY,
            (meta) => {
                connectionRef.current = meta;
                setConnection(meta);
            }
        );
        void sync();
        return () => clearRetry();
    }, []);

    return { authed, ready, profile: user, login, logout, connection };
}
