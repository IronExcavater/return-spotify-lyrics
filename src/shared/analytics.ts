import { getFromStorage, setInStorage } from './storage';

export const ANALYTICS_EVENTS_KEY = 'analytics.events';
export const ANALYTICS_KNOWLEDGE_KEY = 'analytics.knowledge';

export const ANALYTICS_EVENTS = {
    appOpen: 'app.open',
    appRoute: 'app.route',
    appBarChange: 'ui.bar.change',
    playbackExpand: 'ui.playback.expand',
    authLogin: 'auth.login',
    authLogout: 'auth.logout',
    authState: 'auth.state',
    searchSubmit: 'search.submit',
    searchClear: 'search.clear',
    searchFilterAdd: 'search.filter.add',
    searchFilterRemove: 'search.filter.remove',
    searchFilterClear: 'search.filter.clear',
    playbackState: 'playback.state',
    playbackPlay: 'playback.play',
    playbackPause: 'playback.pause',
    playbackNext: 'playback.next',
    playbackPrevious: 'playback.previous',
    playbackSeek: 'playback.seek',
    playbackVolume: 'playback.volume',
    playbackMute: 'playback.mute.toggle',
    playbackShuffle: 'playback.shuffle.toggle',
    playbackRepeat: 'playback.repeat.toggle',
    playbackItem: 'playback.item',
    personalisationView: 'personalisation.view',
} as const;

export type AnalyticsEventName =
    (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

const ANALYTICS_MAX_EVENTS = 500;
const ANALYTICS_MAX_DAYS = 120;

export type AnalyticsEvent = {
    id: string;
    name: AnalyticsEventName;
    reason: string;
    ts: number;
    scope?: string;
    data?: Record<string, unknown>;
};

export type AnalyticsEventInput = {
    name: AnalyticsEventName;
    reason: string;
    scope?: string;
    data?: Record<string, unknown>;
    ts?: number;
};

export type AnalyticsKnowledge = {
    sessions: {
        count: number;
        daysActive: number;
        isNew: boolean;
        isReturning: boolean;
        isRegular: boolean;
    };
    total: {
        prefersLyrics?: boolean;
        prefersPlayback?: boolean;
    };
    search: {
        isSearchHeavy: boolean;
    };
    playback: {
        isPlaybackHeavy: boolean;
    };
};

const buildEventId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isEventLike = (value: unknown): value is AnalyticsEvent => {
    if (!isRecord(value)) return false;
    return (
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.reason === 'string' &&
        typeof value.ts === 'number'
    );
};

const isKnowledgeLike = (value: unknown): value is AnalyticsKnowledge =>
    isRecord(value) && 'sessions' in value && 'total' in value;

const normalizeEvents = (events: AnalyticsEvent[]): AnalyticsEvent[] =>
    events
        .filter(isEventLike)
        .filter((event) => !!event.reason.trim())
        .sort((a, b) => a.ts - b.ts);

const trimEvents = (events: AnalyticsEvent[]): AnalyticsEvent[] => {
    const cutoff = Date.now() - ANALYTICS_MAX_DAYS * 24 * 60 * 60 * 1000;
    const filtered = events.filter((event) => event.ts >= cutoff);
    if (filtered.length <= ANALYTICS_MAX_EVENTS) return filtered;
    return filtered.slice(filtered.length - ANALYTICS_MAX_EVENTS);
};

let recordQueue: Promise<void> = Promise.resolve();

export function createAnalyticsTracker(scope?: string) {
    return (
        name: AnalyticsEventName,
        input: Omit<AnalyticsEventInput, 'name'>
    ) => recordAnalyticsEvent({ name, scope, ...input });
}

export async function getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
    const stored =
        (await getFromStorage<AnalyticsEvent[]>(ANALYTICS_EVENTS_KEY)) ?? [];
    return normalizeEvents(stored);
}

export async function getAnalyticsKnowledge(): Promise<AnalyticsKnowledge> {
    const stored = await getFromStorage<AnalyticsKnowledge>(
        ANALYTICS_KNOWLEDGE_KEY
    );
    if (stored && isKnowledgeLike(stored)) return stored;
    const events = await getAnalyticsEvents();
    const knowledge = analyzeAnalytics(events);
    await setInStorage(ANALYTICS_KNOWLEDGE_KEY, knowledge);
    return knowledge;
}

export function recordAnalyticsEvent(
    input: AnalyticsEventInput
): Promise<void> {
    const reason = input.reason?.trim();
    if (!reason) {
        console.warn('[analytics] Event missing reason', input.name);
        return Promise.resolve();
    }

    recordQueue = recordQueue
        .then(async () => {
            const existing = await getAnalyticsEvents();
            const event: AnalyticsEvent = {
                id: buildEventId(),
                name: input.name,
                reason,
                ts: input.ts ?? Date.now(),
                scope: input.scope,
                data: input.data,
            };
            const nextEvents = trimEvents([...existing, event]);
            await setInStorage(ANALYTICS_EVENTS_KEY, nextEvents);
            const knowledge = analyzeAnalytics(nextEvents);
            await setInStorage(ANALYTICS_KNOWLEDGE_KEY, knowledge);
        })
        .catch((error) => {
            console.warn('[analytics] Failed to record event', error);
        });

    return recordQueue;
}

export function analyzeAnalytics(events: AnalyticsEvent[]): AnalyticsKnowledge {
    const normalized = normalizeEvents(events);
    const activeDays = new Set<string>();
    const routeCounts: Record<string, number> = {};
    let playbackBarVisits = 0;
    let sessionCount = 0;
    let searchSubmits = 0;
    let playbackPlays = 0;

    for (const event of normalized) {
        const date = new Date(event.ts);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        activeDays.add(dateKey);

        switch (event.name) {
            case ANALYTICS_EVENTS.appOpen: {
                sessionCount += 1;
                break;
            }
            case ANALYTICS_EVENTS.appRoute: {
                const route = String(event.data?.to ?? 'unknown');
                routeCounts[route] = (routeCounts[route] ?? 0) + 1;
                break;
            }
            case ANALYTICS_EVENTS.appBarChange: {
                if (event.data?.bar === 'playback') playbackBarVisits += 1;
                break;
            }
            case ANALYTICS_EVENTS.searchSubmit: {
                searchSubmits += 1;
                break;
            }
            case ANALYTICS_EVENTS.playbackPlay: {
                playbackPlays += 1;
                break;
            }
            default: {
                break;
            }
        }
    }

    const daysActive = activeDays.size;
    const lyricsVisits = routeCounts['/lyrics'] ?? 0;
    const playbackVisits = playbackBarVisits || routeCounts['/'] || 0;

    const isNew = sessionCount <= 1 && daysActive <= 1;
    const isReturning = sessionCount > 1;
    const isRegular = sessionCount >= 5 || daysActive >= 7;
    const isSearchHeavy = searchSubmits >= 5;
    const isPlaybackHeavy = playbackPlays >= 5;

    return {
        sessions: {
            count: sessionCount,
            daysActive,
            isNew,
            isReturning,
            isRegular,
        },
        total: {
            prefersLyrics: lyricsVisits >= 2 ? true : undefined,
            prefersPlayback: playbackVisits >= 2 ? true : undefined,
        },
        search: {
            isSearchHeavy,
        },
        playback: {
            isPlaybackHeavy,
        },
    };
}
