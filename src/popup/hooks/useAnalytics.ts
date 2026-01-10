import { useCallback, useEffect, useState } from 'react';
import {
    ANALYTICS_EVENTS_KEY,
    ANALYTICS_KNOWLEDGE_KEY,
    getAnalyticsKnowledge,
    type AnalyticsKnowledge,
} from '../../shared/analytics';

export function useAnalyticsKnowledge() {
    const [knowledge, setKnowledge] = useState<AnalyticsKnowledge>(
        () =>
            ({
                sessions: {
                    count: 0,
                    daysActive: 0,
                    isNew: true,
                    isReturning: false,
                    isRegular: false,
                },
                total: {},
                search: {
                    isSearchHeavy: false,
                },
                playback: {
                    isPlaybackHeavy: false,
                },
            }) satisfies AnalyticsKnowledge
    );

    const refresh = useCallback(async () => {
        const next = await getAnalyticsKnowledge();
        setKnowledge(next);
    }, []);

    useEffect(() => {
        void refresh();
        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ) => {
            if (area !== 'local') return;
            if (
                changes[ANALYTICS_EVENTS_KEY] ||
                changes[ANALYTICS_KNOWLEDGE_KEY]
            ) {
                void refresh();
            }
        };

        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, [refresh]);

    return {
        knowledge,
        refresh,
    };
}
