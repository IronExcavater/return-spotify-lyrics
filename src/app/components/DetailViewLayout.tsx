import { type ReactNode, useRef } from 'react';

import { Box, Flex } from '@radix-ui/themes';
import type { MediaActionGroup } from '../../shared/types';
import { type HeroData, MediaHero } from './MediaHero';
import { StickyLayout } from './StickyLayout';

type Props = {
    hero: HeroData | null;
    loading: boolean;
    heroUrl?: string;
    collapseKey?: string;
    resetScroll?: boolean;
    mergedHeroActions: MediaActionGroup | null;
    canTogglePlayback: boolean;
    onPlay: () => void;
    children: ReactNode;
    contentGap?: '0' | '1' | '2' | '3' | '4' | '5' | '6';
};

export function DetailViewLayout({
    hero,
    loading,
    heroUrl,
    collapseKey,
    resetScroll,
    mergedHeroActions,
    canTogglePlayback,
    onPlay,
    children,
    contentGap,
}: Props) {
    const scrollRef = useRef<HTMLDivElement | null>(null);

    return (
        <StickyLayout.Root
            className="no-overflow-anchor scrollbar-gutter-stable flex flex-col overflow-y-auto"
            scrollRef={scrollRef}
        >
            <MediaHero
                hero={hero}
                loading={loading}
                heroUrl={heroUrl}
                scrollRef={scrollRef}
                collapseKey={collapseKey}
                resetScroll={resetScroll}
                mergedHeroActions={mergedHeroActions}
                canTogglePlayback={canTogglePlayback}
                onPlay={onPlay}
            />

            <StickyLayout.Body>
                <Box className="absolute -top-2 z-10 h-2 w-full bg-background" />
                <Flex pl="3" pr="1" direction="column" gap={contentGap}>
                    {children}
                </Flex>
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
