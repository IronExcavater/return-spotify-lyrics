import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchFilter } from './useSearch';

type SessionMeta = {
    sessions: number;
    firstVisit: number;
    lastVisit: number;
};

export type HeadingCopy = {
    title: string;
    subtitle: string;
};

export type PersonalisationSnapshot = {
    heading: HeadingCopy;
    usage: {
        sessions: number;
        daysActive: number;
    };
};

const STORAGE_KEY = 'experience-personalisation-meta';

const nowMs = () => Date.now();

const getDefaultMeta = (): SessionMeta => {
    const now = nowMs();
    return {
        sessions: 0,
        firstVisit: now,
        lastVisit: now,
    };
};

const readMeta = (): SessionMeta => {
    if (typeof window === 'undefined' || !window.localStorage)
        return getDefaultMeta();

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultMeta();
        const parsed = JSON.parse(raw);
        if (
            typeof parsed.sessions !== 'number' ||
            typeof parsed.firstVisit !== 'number' ||
            typeof parsed.lastVisit !== 'number'
        )
            return getDefaultMeta();
        return parsed;
    } catch {
        return getDefaultMeta();
    }
};

const persistMeta = (meta: SessionMeta) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {
        // Best-effort; ignore storage failures.
    }
};

const getTimeGreeting = (hours: number) => {
    if (hours < 5) return 'Late night';
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    if (hours < 22) return 'Good evening';
    return 'Unwinding late';
};

const buildFilterSummary = (filters: SearchFilter[]) => {
    if (!filters.length) return '';
    const labels = filters.map((filter) => filter.label);
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels.join(' and ');
    const [first, second, ...rest] = labels;
    return `${first}, ${second} +${rest.length} more`;
};

export function usePersonalisation({
    searchQuery = '',
    filters = [],
}: {
    searchQuery?: string;
    filters?: SearchFilter[];
} = {}): PersonalisationSnapshot {
    const [meta, setMeta] = useState<SessionMeta>(() => readMeta());
    const recordedRef = useRef(false);

    useEffect(() => {
        if (recordedRef.current) return;
        recordedRef.current = true;

        const now = nowMs();
        setMeta((prev) => {
            const next: SessionMeta = {
                sessions: Math.max(0, prev.sessions) + 1,
                firstVisit: prev.firstVisit || now,
                lastVisit: now,
            };
            persistMeta(next);
            return next;
        });
    }, []);

    const snapshot = useMemo<PersonalisationSnapshot>(() => {
        const now = new Date();
        const hours = now.getHours();
        const greeting = getTimeGreeting(hours);
        const sessions = Math.max(1, meta.sessions || 1);
        const filterSummary = buildFilterSummary(filters);

        const daysActive = Math.max(
            1,
            Math.round(
                (meta.lastVisit - meta.firstVisit) / (1000 * 60 * 60 * 24)
            ) + 1
        );
        const longTimer = sessions > 20 || daysActive > 21;
        const title =
            sessions === 1
                ? `${greeting}, welcome`
                : longTimer
                  ? `${greeting}, regular`
                  : `${greeting} again`;

        const heading: HeadingCopy = (() => {
            if (searchQuery.trim()) {
                const trimmed = searchQuery.trim();
                return {
                    title,
                    subtitle: filterSummary
                        ? `Tuning "${trimmed}" with ${filterSummary}.`
                        : `Dialling up "${trimmed}".`,
                };
            }

            if (filterSummary) {
                return {
                    title,
                    subtitle: `Filters on: ${filterSummary}.`,
                };
            }

            if (longTimer) {
                return {
                    title,
                    subtitle: `You have dropped by ${sessions} times across ${daysActive} days.`,
                };
            }

            if (sessions > 3) {
                return {
                    title,
                    subtitle: 'Picking up where you left off.',
                };
            }

            return {
                title,
                subtitle: 'Fresh picks ready whenever you are.',
            };
        })();

        return {
            heading,
            usage: {
                sessions,
                daysActive,
            },
        };
    }, [filters, meta.firstVisit, meta.lastVisit, meta.sessions, searchQuery]);

    return snapshot;
}
