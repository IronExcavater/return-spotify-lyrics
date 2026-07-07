import { Flex, Text, Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import {
    SPOTIFY_SCOPE_DESCRIPTIONS,
    type SpotifyAuthNotice,
} from './spotifyAuthNotices';

type NoticeTone = 'dark' | 'panel';

type Props = {
    notices: SpotifyAuthNotice[];
    tone?: NoticeTone;
    className?: string;
};

const toneClasses: Record<
    NoticeTone,
    {
        notice: string;
        title: string;
        description: string;
        chip: string;
    }
> = {
    dark: {
        notice: 'border-white/10 bg-white/5',
        title: 'text-white',
        description: 'text-white/70',
        chip: 'bg-white/5 text-white/70 hover:bg-white/8',
    },
    panel: {
        notice: 'border-grayA-6 bg-grayA-2',
        title: 'text-gray-12',
        description: 'text-gray-11',
        chip: 'bg-grayA-3 text-gray-11 hover:bg-grayA-4',
    },
};

const renderScopeChip = (scope: string, tone: NoticeTone) => {
    const description = SPOTIFY_SCOPE_DESCRIPTIONS[scope];
    const chip = (
        <Text
            key={scope}
            size="1"
            className={clsx(
                'rounded-full px-2 py-0.5 transition-colors',
                toneClasses[tone].chip
            )}
        >
            {scope}
        </Text>
    );
    if (!description) return chip;

    return (
        <Tooltip key={scope} content={description}>
            {chip}
        </Tooltip>
    );
};

export function SpotifyAuthNoticeList({
    notices,
    tone = 'panel',
    className,
}: Props) {
    if (notices.length === 0) return null;

    return (
        <Flex
            direction="column"
            gap="2"
            role="status"
            aria-live="polite"
            className={className}
        >
            {notices.map((notice) => (
                <Flex
                    key={notice.reason}
                    direction="column"
                    gap="1"
                    className={clsx(
                        'rounded-2 border p-3',
                        toneClasses[tone].notice
                    )}
                >
                    <Text
                        size="2"
                        weight="bold"
                        className={toneClasses[tone].title}
                    >
                        {notice.title}
                    </Text>
                    <Text size="1" className={toneClasses[tone].description}>
                        {notice.description}
                    </Text>
                    {notice.scopes && notice.scopes.length > 0 && (
                        <Flex gap="1" wrap="wrap" pt="1">
                            {notice.scopes.map((scope) =>
                                renderScopeChip(scope, tone)
                            )}
                        </Flex>
                    )}
                </Flex>
            ))}
        </Flex>
    );
}
