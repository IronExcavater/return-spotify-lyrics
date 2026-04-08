import {
    createContext,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    getFromStorage,
    onStorageChange,
    setInStorage,
} from '../../shared/storage';

export type Settings = {
    reducedMotion?: boolean;
    locale?: string;
};

type SettingsContextValue = {
    settings: Settings;
    updateSettings: (patch: Partial<Settings>) => void;
};

const SETTINGS_KEY = 'userSettings';
const DEFAULT_SETTINGS: Settings = {
    reducedMotion: false,
    locale: 'system',
};

const mergeSettings = (overrides?: Partial<Settings>): Settings => ({
    ...DEFAULT_SETTINGS,
    ...(overrides ?? {}),
});

export const SettingsContext = createContext<SettingsContextValue>({
    settings: DEFAULT_SETTINGS,
    updateSettings: () => undefined,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

    useEffect(() => {
        let cancelled = false;
        const unsubscribe = onStorageChange<Settings>(SETTINGS_KEY, (next) =>
            setSettings(mergeSettings(next))
        );

        void (async () => {
            const saved = await getFromStorage<Settings>(SETTINGS_KEY);
            if (cancelled) return;

            setSettings(mergeSettings(saved));
        })();

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const updateSettings = useCallback((patch: Partial<Settings>) => {
        setSettings((prev) => {
            const next = mergeSettings({ ...prev, ...patch });
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
