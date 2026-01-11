import { useEffect, useMemo, useRef } from 'react';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import {
    buildPersonalisationSnapshot,
    type PersonalisationSnapshot,
} from '../../shared/personalisation';
import { useAnalyticsKnowledge } from './useAnalytics';
import type { SearchFilter } from './useSearch';

export function usePersonalisation({
    searchQuery = '',
    filters = [],
}: {
    searchQuery?: string;
    filters?: SearchFilter[];
} = {}): PersonalisationSnapshot {
    const { knowledge } = useAnalyticsKnowledge();
    const trackPersonalisation = useMemo(
        () => createAnalyticsTracker('personalisation'),
        []
    );
    const recordedRef = useRef(false);

    useEffect(() => {
        if (recordedRef.current) return;
        recordedRef.current = true;
        void trackPersonalisation(ANALYTICS_EVENTS.personalisationView, {
            reason: 'personalisation snapshot requested',
            data: {
                hasQuery: !!searchQuery.trim(),
                filterCount: filters.length,
            },
        });
    }, [filters.length, searchQuery, trackPersonalisation]);

    const snapshot = useMemo<PersonalisationSnapshot>(() => {
        return buildPersonalisationSnapshot(knowledge, {
            searchQuery,
            filterCount: filters.length,
        });
    }, [knowledge, searchQuery, filters.length]);

    return snapshot;
}

export type {
    Heading,
    PersonalisationSnapshot,
} from '../../shared/personalisation';
