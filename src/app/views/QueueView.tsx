import { useCallback } from 'react';
import { Button, Flex, Text } from '@radix-ui/themes';

import { resolveLocale } from '../../shared/locale';
import type { MediaActionGroup } from '../../shared/types';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { MediaShelf } from '../components/MediaShelf';
import { StickyLayout } from '../components/StickyLayout';
import { buildMediaActions } from '../hooks/useMediaActions';
import { type QueueEntry, useQueueState } from '../hooks/useQueueState';
import { useSettings } from '../hooks/useSettings';
import type { MediaShelfItem } from '../types/mediaShelf';

export function QueueView() {
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);
    const {
        loading,
        syncing: syncingQueue,
        nowPlaying,
        upcoming,
        clearQueue,
        reorderQueue,
        removeFromQueue,
    } = useQueueState(locale);

    const nowPlayingLoading = loading && !nowPlaying;
    const upcomingLoading = loading && upcoming.length === 0;

    const getQueueItemActions = useCallback(
        (item: MediaShelfItem): MediaActionGroup => {
            const queueItem = item as QueueEntry;
            const base = buildMediaActions(queueItem);
            const primary = base.primary.filter(
                (action) => action.id !== 'add-queue'
            );

            primary.push({
                id: 'remove-queue',
                label: 'Remove from queue',
                shortcut: 'Del',
                onSelect: () => {
                    removeFromQueue(queueItem.queueKey);
                },
            });

            return { primary, secondary: base.secondary };
        },
        [removeFromQueue]
    );

    const getNowPlayingActions = useCallback((item: MediaShelfItem) => {
        const base = buildMediaActions(item);

        return {
            primary: base.primary.filter(
                (action) =>
                    action.id !== 'play-now' &&
                    action.id !== 'add-queue' &&
                    action.id !== 'remove-queue'
            ),
            secondary: base.secondary,
        } satisfies MediaActionGroup;
    }, []);

    const handleReorder = useCallback(
        (items: MediaShelfItem[]) => {
            reorderQueue(items as QueueEntry[]);
        },
        [reorderQueue]
    );

    const queueHeaderRight = (
        <Button
            size="1"
            variant="soft"
            color="gray"
            disabled={upcomingLoading || syncingQueue || upcoming.length === 0}
            onClick={clearQueue}
        >
            Clear queue
        </Button>
    );

    return (
        <StickyLayout.Root className="no-overflow-anchor scrollbar-gutter-stable flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <StickyLayout.Body>
                <Flex
                    pl="3"
                    pr="1"
                    pt="2"
                    pb="1"
                    direction="column"
                    gap="3"
                    className="min-w-0"
                >
                    <MediaSection
                        editing={false}
                        loading={nowPlayingLoading}
                        stickyHeader={false}
                        section={
                            {
                                id: 'queue-now-playing',
                                title: 'Now playing',
                                view: 'list',
                                infinite: 'rows',
                                rows: 0,
                                items: nowPlaying ? [nowPlaying] : [],
                            } satisfies MediaSectionState
                        }
                        onChange={() => undefined}
                        renderContent={({ loading: sectionLoading }) => {
                            if (!sectionLoading && !nowPlaying) {
                                return (
                                    <Text size="2" color="gray">
                                        Nothing is playing right now.
                                    </Text>
                                );
                            }

                            return (
                                <MediaShelf
                                    items={nowPlaying ? [nowPlaying] : []}
                                    variant="list"
                                    orientation="vertical"
                                    itemsPerColumn={1}
                                    interactive={!sectionLoading}
                                    itemLoading={sectionLoading}
                                    getActions={getNowPlayingActions}
                                />
                            );
                        }}
                    />

                    <MediaSection
                        editing={false}
                        loading={upcomingLoading}
                        headerRight={queueHeaderRight}
                        section={
                            {
                                id: 'queue-up-next',
                                title: 'Up next',
                                view: 'list',
                                infinite: 'rows',
                                rows: 0,
                                items: upcoming,
                            } satisfies MediaSectionState
                        }
                        onChange={() => undefined}
                        renderContent={({ loading: sectionLoading }) => {
                            if (!sectionLoading && upcoming.length === 0) {
                                return (
                                    <Text size="2" color="gray">
                                        Queue is empty.
                                    </Text>
                                );
                            }

                            return (
                                <MediaShelf
                                    items={upcoming}
                                    variant="list"
                                    orientation="vertical"
                                    itemsPerColumn={6}
                                    draggable={!sectionLoading && !syncingQueue}
                                    interactive={!sectionLoading}
                                    itemLoading={sectionLoading}
                                    onReorder={handleReorder}
                                    getActions={getQueueItemActions}
                                />
                            );
                        }}
                    />
                </Flex>
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
