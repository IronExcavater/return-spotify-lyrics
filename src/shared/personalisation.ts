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

const getTimeGreeting = (hours: number) => {
    if (hours < 5) return 'Late night';
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    if (hours < 22) return 'Good evening';
    return 'Unwinding late';
};

export function buildPersonalisationSnapshot(
    knowledge: AnalyticsKnowledge
): PersonalisationSnapshot {
    const now = new Date();
    const greeting = getTimeGreeting(now.getHours());
    const sessions = Math.max(1, knowledge.sessions.count || 1);
    const daysActive = Math.max(1, knowledge.sessions.daysActive || 1);
    const longTimer = sessions > 20 || daysActive > 21;
    const isNew = knowledge.sessions.isNew;
    const isRegular = knowledge.sessions.isRegular || longTimer;

    const pick = (options: string[]) => {
        const seed =
            sessions * 13 +
            daysActive * 7 +
            now.getDate() +
            (knowledge.search.isSearchHeavy ? 3 : 0) +
            (knowledge.playback.isPlaybackHeavy ? 5 : 0);
        return options[Math.abs(seed) % options.length];
    };

    const title = (() => {
        if (isNew) return `${greeting}, welcome`;
        if (isRegular) return `${greeting}, good to see you`;
        return `${greeting}, back again`;
    })();

    const subtitle = (() => {
        if (knowledge.playback.isPlaybackHeavy) {
            return pick([
                'Queue-ready picks based on how you play.',
                'Playback-heavy sessions — here is what fits.',
                'Let us keep the momentum going.',
            ]);
        }

        if (knowledge.search.isSearchHeavy) {
            return pick([
                'Search-first sessions keep your mixes sharp.',
                'Precision picks for how you explore.',
                'Let us surface the exact vibe.',
            ]);
        }

        if (knowledge.total.prefersLyrics) {
            return pick([
                'Lyrics-first sessions still feel right.',
                'Words-forward listening, ready when you are.',
                'Keep the lyrics close today.',
            ]);
        }

        if (sessions > 3) {
            return pick([
                'Picking up where you left off.',
                'Carry on from your last session.',
                'Ready for the next run.',
            ]);
        }

        return pick([
            'Fresh picks ready whenever you are.',
            'Start a new run, your way.',
            'Let us find something that lands.',
        ]);
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
