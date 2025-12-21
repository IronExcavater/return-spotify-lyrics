import { useEffect, useRef, useState } from 'react';
import { UserProfile } from '@spotify/web-api-ts-sdk';
import { Msg, sendMessage, sendSpotifyMessage } from '../../shared/messaging';
import { getFromStorage, setInStorage } from '../../shared/storage';

const SPOTIFY_USER_KEY = 'spotifyUser';
const SPOTIFY_CONNECTION_KEY = 'spotifyConnectionMeta';

export interface SpotifyConnectionMeta {
    userId: string;
    connectedAt: number;
    lastActiveAt: number;
    sessionCount: number;
}

export function useSpotifyAuth() {
    const [authed, setAuthed] = useState<boolean | undefined>(undefined);
    const [user, setUser] = useState<UserProfile | undefined>(undefined);
    const [connection, setConnection] = useState<
        SpotifyConnectionMeta | undefined
    >(undefined);
    const connectionRef = useRef<SpotifyConnectionMeta | undefined>(undefined);
    const sessionActiveRef = useRef(false);

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
        } catch (error) {
            console.warn('[spotifyAuth] Failed to sync Spotify user', error);
            setAuthed(false);
            setUser(undefined);
            sessionActiveRef.current = false;
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
    }, []);

    return { authed, profile: user, login, logout, connection };
}
