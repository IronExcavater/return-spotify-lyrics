import type { AnalyticsKnowledge } from './analytics';

export type Heading = {
    title: string;
    subtitle: string;
};

export type PersonalisationSnapshot = {
    heading: Heading;
    usage: {
        sessions: number;
        daysActive: number;
    };
};

export type PersonalisationContext = {
    searchQuery?: string;
};

const getTimeGreeting = (hours: number) => {
    if (hours < 5) return 'Late night';
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    if (hours < 22) return 'Good evening';
    return 'Unwinding late';
};

export function buildPersonalisationSnapshot(
    knowledge: AnalyticsKnowledge,
    { searchQuery = '' }: PersonalisationContext = {}
): PersonalisationSnapshot {
    const now = new Date();
    const greeting = getTimeGreeting(now.getHours());
    const sessions = Math.max(1, knowledge.sessions.count || 1);
    const daysActive = Math.max(1, knowledge.sessions.daysActive || 1);
    const longTimer = sessions > 20 || daysActive > 21;
    const title =
        sessions === 1
            ? `${greeting}, welcome`
            : longTimer
              ? `${greeting}, regular`
              : `${greeting} again`;

    const subtitle = (() => {
        if (searchQuery.trim()) {
            const trimmed = searchQuery.trim();
            return `Dialling up "${trimmed}".`;
        }

        if (longTimer) {
            return `You have dropped by ${sessions} times across ${daysActive} days.`;
        }

        if (knowledge.playback.isPlaybackHeavy) {
            return 'Queue-ready picks based on how you play.';
        }

        if (knowledge.search.isSearchHeavy) {
            return 'Search-first sessions keep your mixes sharp.';
        }

        if (knowledge.total.prefersLyrics) {
            return 'Lyrics mode is usually where you land.';
        }

        if (sessions > 3) {
            return 'Picking up where you left off.';
        }

        return 'Fresh picks ready whenever you are.';
    })();

    return {
        heading: {
            title,
            subtitle,
        },
        usage: {
            sessions,
            daysActive,
        },
    };
}
