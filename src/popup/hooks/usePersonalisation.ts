import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import {
    buildPersonalisationSnapshot,
    type PersonalisationSnapshot,
} from '../../shared/personalisation';
import type { SearchFilter } from '../../shared/types';
import { useAnalyticsKnowledge } from './useAnalytics';

const LOADING_SNAPSHOT: PersonalisationSnapshot = {
    heading: {
        title: 'Loading your home mix',
        subtitle: 'Tuning the shelves for you',
    },
    usage: {
        sessions: 0,
        daysActive: 0,
    },
};

export type PersonalisationState = PersonalisationSnapshot & {
    loading: boolean;
};

let cachedSnapshot: PersonalisationSnapshot | null = null;

export function usePersonalisation({
    searchQuery = '',
    filters = [],
}: {
    searchQuery?: string;
    filters?: SearchFilter[];
} = {}): PersonalisationState {
    const { knowledge, hydrated } = useAnalyticsKnowledge();
    const trackPersonalisation = useMemo(
        () => createAnalyticsTracker('personalisation'),
        []
    );
    const recordedRef = useRef(false);
    const [snapshot, setSnapshot] = useState<PersonalisationSnapshot | null>(
        () => cachedSnapshot
    );

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

    useEffect(() => {
        if (!hydrated || snapshot) return;
        const next = buildPersonalisationSnapshot(knowledge, {
            searchQuery,
            filterCount: filters.length,
        });
        cachedSnapshot = next;
        setSnapshot(next);
    }, [filters.length, hydrated, knowledge, searchQuery, snapshot]);

    if (!hydrated || !snapshot) {
        return {
            ...LOADING_SNAPSHOT,
            loading: true,
        } satisfies PersonalisationState;
    }

    return {
        ...snapshot,
        loading: false,
    } satisfies PersonalisationState;
}

export type {
    Heading,
    PersonalisationSnapshot,
} from '../../shared/personalisation';
