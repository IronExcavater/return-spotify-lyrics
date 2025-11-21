import { useEffect, useState } from 'react';
import { Msg } from '../../shared/messaging';
import { SpotifyProfile } from '../../shared/types';

export function useAuth() {
    const [authed, setAuthed] = useState<boolean | undefined>(undefined);
    const [profile, setProfile] = useState<SpotifyProfile | undefined>(undefined);

    const syncAuth = () => {
        chrome.runtime.sendMessage(
            { type: Msg.GET_PROFILE },
            (resp: SpotifyProfile | undefined) => {
                const isAuthed = !!resp;
                setAuthed(isAuthed);
                setProfile(resp);
            }
        );
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
                syncAuth();
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // Initial auth sync
    useEffect(() => syncAuth());

    return { authed, profile, login, logout };
}
