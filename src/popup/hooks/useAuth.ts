import { useEffect, useState } from 'react';
import { Msg } from '../../shared/messaging';
import { User } from '@spotify/web-api-ts-sdk';
import { getFromStorage, setInStorage } from '../../shared/storage';

const SPOTIFY_USER_KEY = 'spotifyUser';

export function useAuth() {
    const [authed, setAuthed] = useState<boolean | undefined>(undefined);
    const [user, setUser] = useState<User | undefined>(undefined);

    const sync = () => {
        chrome.runtime.sendMessage({ type: Msg.GET_PROFILE }, (resp) => {
            const isAuthed = resp != null;
            setAuthed(isAuthed);
            setUser(resp);
            void setInStorage<User>(SPOTIFY_USER_KEY, resp);
        });
    };

    const login = () => {
        void chrome.runtime.sendMessage({ type: Msg.LOGIN_SPOTIFY });
    };

    const logout = () => {
        void chrome.runtime.sendMessage({ type: Msg.LOGOUT_SPOTIFY });
    };

    // React to token changes in chrome storage
    useEffect(() => {
        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ) => {
            if (area === 'local' && changes.spotifyToken) {
                sync();
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // Initial auth sync
    useEffect(() => {
        getFromStorage<User>(SPOTIFY_USER_KEY, (user) => {
            setUser(user);
        });
        sync();
    }, []);

    return { authed, profile: user, login, logout };
}
