import type { ReactNode } from 'react';
import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';

import { useScrollFade } from '../hooks/useScrollFade';
import { MediaGroup, MediaGroupProps } from './MediaGroup';
import { MediaRow } from './MediaRow';

export type MediaGroupShelfGroup = MediaGroupProps & {
    id: string;
};

type Props = {
    groups: MediaGroupShelfGroup[];
    loading?: boolean;
    loadingCount?: number;
    loadingRowsPerGroup?: number;
    emptyState?: ReactNode;
    className?: string;
};

export function MediaGroupShelf({
    groups,
    loading = false,
    loadingCount = 2,
    loadingRowsPerGroup = 3,
    emptyState,
    className,
}: Props) {
    const { scrollRef, fade } = useScrollFade('vertical', [
        loading,
        loadingCount,
        groups.length,
    ]);

    return (
        <Flex className="relative" overflow="hidden">
            <Flex
                flexGrow="1"
                direction="column"
                gap="1"
                overflowY="auto"
                ref={scrollRef}
                className={clsx('scrollbar-gutter-stable', className)}
            >
                {loading &&
                    Array.from({ length: loadingCount }, (_, index) => (
                        <MediaGroup
                            key={`media-group-loading-${index}`}
                            loading
                            title="Loading"
                            subtitle={`${loadingRowsPerGroup} tracks`}
                            selection={{
                                checked: false,
                                onCheckedChange: () => undefined,
                            }}
                        >
                            <Flex direction="column" gap="1">
                                {Array.from(
                                    { length: loadingRowsPerGroup },
                                    (_, rowIndex) => (
                                        <MediaRow
                                            key={`media-group-loading-row-${index}-${rowIndex}`}
                                            loading
                                            title="Loading"
                                            subtitle="Loading"
                                            showPosition
                                            position={rowIndex}
                                            className="px-1.5 py-1"
                                        />
                                    )
                                )}
                            </Flex>
                        </MediaGroup>
                    ))}
                {!loading && groups.length === 0 && emptyState}
                {!loading &&
                    groups.map(({ id, ...group }) => (
                        <MediaGroup key={id} {...group} />
                    ))}
            </Flex>

            <div
                className={clsx(
                    'from-panel-solid via-panel-solid/70 pointer-events-none absolute top-0 right-0 left-0 z-10 h-3 bg-linear-to-b to-transparent transition-opacity',
                    fade.start ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden
            />
            <div
                className={clsx(
                    'from-panel-solid via-panel-solid/70 pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-3 bg-linear-to-t to-transparent transition-opacity',
                    fade.end ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden
            />
        </Flex>
    );
}
