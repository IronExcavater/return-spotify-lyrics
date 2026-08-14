import { useEffect, useState } from 'react';

import {
    preferencesStorage,
    type Preferences,
} from '@/platform/storage';

const fallback: Preferences = {
    compactMedia: false,
    showExplicitBadge: true,
};

export function usePreferences() {
    const [preferences, setPreferences] = useState<Preferences>(fallback);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        void preferencesStorage.getValue().then((value) => {
            if (!mounted) return;
            setPreferences(value);
            setReady(true);
        });

        const unwatch = preferencesStorage.watch((value) => {
            if (mounted) setPreferences(value);
        });

        return () => {
            mounted = false;
            unwatch();
        };
    }, []);

    const update = async (patch: Partial<Preferences>) => {
        const next = { ...preferences, ...patch };
        setPreferences(next);
        await preferencesStorage.setValue(next);
    };

    return { preferences, ready, update };
}
