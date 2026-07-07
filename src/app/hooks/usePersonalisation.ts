import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import {
    buildPersonalisationSnapshot,
    type PersonalisationSnapshot,
} from '../../shared/personalisation';
import type { SearchInput } from '../../shared/search';
import {
    readPersonalisationSnapshot,
    writePersonalisationSnapshot,
} from '../data/personalisationStore';
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

const EMPTY_SEARCH: SearchInput = {
    query: '',
    filters: [],
};

export type PersonalisationState = PersonalisationSnapshot & {
    loading: boolean;
};

export function usePersonalisation(
    search: SearchInput = EMPTY_SEARCH
): PersonalisationState {
    const { query, filters } = search;
    const { knowledge, hydrated } = useAnalyticsKnowledge();
    const trackPersonalisation = useMemo(
        () => createAnalyticsTracker('personalisation'),
        []
    );
    const recordedRef = useRef(false);
    const [snapshot, setSnapshot] = useState<PersonalisationSnapshot | null>(
        readPersonalisationSnapshot
    );

    useEffect(() => {
        if (recordedRef.current) return;
        recordedRef.current = true;
        void trackPersonalisation(ANALYTICS_EVENTS.personalisationView, {
            reason: 'personalisation snapshot requested',
            data: {
                hasQuery: !!query.trim(),
                filterCount: filters.length,
            },
        });
    }, [filters.length, query, trackPersonalisation]);

    useEffect(() => {
        if (!hydrated || snapshot) return;
        const next = buildPersonalisationSnapshot(knowledge);
        writePersonalisationSnapshot(next);
        setSnapshot(next);
    }, [filters.length, hydrated, knowledge, query, snapshot]);

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
