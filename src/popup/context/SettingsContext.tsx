import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { getFromStorage, setInStorage } from '../../shared/storage';

export type Settings = {
    reducedMotion?: boolean;
    locale?: string;
};

type SettingsContextValue = {
    settings: Settings;
    updateSettings: (patch: Partial<Settings>) => void;
};

const SETTINGS_KEY = 'userSettings';
const defaultSettings: Settings = {
    reducedMotion: false,
    locale: 'system',
};

export const SettingsContext = createContext<SettingsContextValue>({
    settings: defaultSettings,
    updateSettings: () => undefined,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);

    useEffect(() => {
        getFromStorage<Settings>(SETTINGS_KEY, (saved) => {
            if (saved) setSettings({ ...defaultSettings, ...saved });
        });

        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            areaName: string
        ) => {
            if (areaName !== 'local') return;
            const change = changes[SETTINGS_KEY];
            if (!change) return;
            setSettings({ ...defaultSettings, ...(change.newValue ?? {}) });
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const updateSettings = useCallback((patch: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            void setInStorage(SETTINGS_KEY, next);
            return next;
        });
    }, []);

    const value = useMemo(
        () => ({ settings, updateSettings }),
        [settings, updateSettings]
    );

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}
