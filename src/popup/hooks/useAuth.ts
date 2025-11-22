import { useEffect, useState } from 'react';
import { Msg } from '../../shared/messaging';
import { User } from '@spotify/web-api-ts-sdk';

export function useAuth() {
    const [authed, setAuthed] = useState<boolean | undefined>(undefined);
    const [profile, setProfile] = useState<User | undefined>(undefined);

    const sync = () => {
        chrome.runtime.sendMessage({ type: Msg.GET_PROFILE }, (resp) => {
            const isAuthed = resp != null;
            setAuthed(isAuthed);
            setProfile(resp);
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
        sync();
    }, []);

    return { authed, profile, login, logout };
}
