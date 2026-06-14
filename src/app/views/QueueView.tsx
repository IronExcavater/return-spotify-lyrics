import { useCallback, useMemo, useState } from 'react';
import {
    CounterClockwiseClockIcon,
    ListBulletIcon,
} from '@radix-ui/react-icons';
import { Button, Flex, Tabs, Text } from '@radix-ui/themes';

import { resolveLocale } from '../../shared/locale';
import type { MediaActionGroup } from '../../shared/types';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/media/MediaSection';
import { MediaShelf } from '../components/media/MediaShelf';
import { StickyLayout } from '../components/StickyLayout';
import { type QueueEntry, useQueueState } from '../hooks/useQueueState';
import { useSettings } from '../hooks/useSettings';
import { buildMediaActions } from '../mediaActions';
import type { MediaShelfItem } from '../types/mediaShelf';

type QueueTab = 'queue' | 'recently-played';

export function QueueView() {
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);
    const {
        loading,
        recentlyPlayedLoading,
        syncing: syncingQueue,
        nowPlaying,
        upcoming,
        recentlyPlayed,
        clearQueue,
        reorderQueue,
        removeFromQueue,
        premiumRequired,
    } = useQueueState(locale);
    const [activeTab, setActiveTab] = useState<QueueTab>('queue');

    const nowPlayingLoading = loading && !nowPlaying;
    const upcomingLoading = loading && upcoming.length === 0;
    const recentlyPlayedSectionLoading =
        recentlyPlayedLoading && recentlyPlayed.length === 0;
    const tabItems = useMemo<
        Array<{ key: QueueTab; label: string; icon: JSX.Element }>
    >(
        () => [
            {
                key: 'queue',
                label: 'Queue',
                icon: <ListBulletIcon />,
            },
            {
                key: 'recently-played',
                label: 'Recently played',
                icon: <CounterClockwiseClockIcon />,
            },
        ],
        []
    );

    const getQueueItemActions = useCallback(
        (item: MediaShelfItem): MediaActionGroup => {
            const queueItem = item as QueueEntry;
            const base = buildMediaActions(queueItem, {
                premiumPlaybackBlocked: premiumRequired,
            });
            const primary = base.primary.filter(
                (action) => action.id !== 'add-queue'
            );

            primary.push({
                id: 'remove-queue',
                label: 'Remove from queue',
                shortcut: 'Del',
                disabled: premiumRequired,
                onSelect: () => {
                    removeFromQueue(queueItem.queueKey);
                },
            });

            return { primary, secondary: base.secondary };
        },
        [premiumRequired, removeFromQueue]
    );

    const getRecentlyPlayedActions = useCallback(
        (item: MediaShelfItem): MediaActionGroup => {
            const base = buildMediaActions(item, {
                premiumPlaybackBlocked: premiumRequired,
            });

            return {
                primary: base.primary.filter(
                    (action) => action.id !== 'add-queue'
                ),
                secondary: base.secondary,
            };
        },
        [premiumRequired]
    );

    const getNowPlayingActions = useCallback(
        (item: MediaShelfItem) => {
            const base = buildMediaActions(item, {
                premiumPlaybackBlocked: premiumRequired,
            });

            return {
                primary: base.primary.filter(
                    (action) =>
                        action.id !== 'play-now' &&
                        action.id !== 'add-queue' &&
                        action.id !== 'remove-queue'
                ),
                secondary: base.secondary,
            } satisfies MediaActionGroup;
        },
        [premiumRequired]
    );

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
            disabled={
                premiumRequired ||
                upcomingLoading ||
                syncingQueue ||
                upcoming.length === 0
            }
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
                    <Tabs.Root
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as QueueTab)
                        }
                    >
                        <Tabs.List size="1">
                            {tabItems.map((tab) => (
                                <Tabs.Trigger key={tab.key} value={tab.key}>
                                    <Flex align="center" gap="2">
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </Flex>
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>

                        <Tabs.Content value="queue">
                            <Flex direction="column" gap="3" pt="3">
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
                                            items: nowPlaying
                                                ? [nowPlaying]
                                                : [],
                                        } satisfies MediaSectionState
                                    }
                                    onChange={() => undefined}
                                    renderContent={({
                                        loading: sectionLoading,
                                    }) => {
                                        if (!sectionLoading && !nowPlaying) {
                                            return (
                                                <Text size="2" color="gray">
                                                    Nothing is playing right
                                                    now.
                                                </Text>
                                            );
                                        }

                                        return (
                                            <MediaShelf
                                                items={
                                                    nowPlaying
                                                        ? [nowPlaying]
                                                        : []
                                                }
                                                variant="list"
                                                orientation="vertical"
                                                itemsPerColumn={1}
                                                interactive={!sectionLoading}
                                                itemLoading={sectionLoading}
                                                enablePrimaryPlay
                                                getActions={
                                                    getNowPlayingActions
                                                }
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
                                    renderContent={({
                                        loading: sectionLoading,
                                    }) => {
                                        if (
                                            !sectionLoading &&
                                            upcoming.length === 0
                                        ) {
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
                                                draggable={
                                                    !sectionLoading &&
                                                    !syncingQueue &&
                                                    !premiumRequired
                                                }
                                                interactive={!sectionLoading}
                                                itemLoading={sectionLoading}
                                                enablePrimaryPlay
                                                onReorder={handleReorder}
                                                getActions={getQueueItemActions}
                                            />
                                        );
                                    }}
                                />
                            </Flex>
                        </Tabs.Content>

                        <Tabs.Content value="recently-played">
                            <MediaSection
                                editing={false}
                                loading={recentlyPlayedSectionLoading}
                                stickyHeader={false}
                                section={
                                    {
                                        id: 'queue-recently-played',
                                        title: 'Recently played',
                                        view: 'list',
                                        infinite: 'rows',
                                        rows: 0,
                                        items: recentlyPlayed,
                                    } satisfies MediaSectionState
                                }
                                onChange={() => undefined}
                                renderContent={({
                                    loading: sectionLoading,
                                }) => {
                                    if (
                                        !sectionLoading &&
                                        recentlyPlayed.length === 0
                                    ) {
                                        return (
                                            <Text size="2" color="gray">
                                                Nothing has been played
                                                recently.
                                            </Text>
                                        );
                                    }

                                    return (
                                        <MediaShelf
                                            items={recentlyPlayed}
                                            variant="list"
                                            orientation="vertical"
                                            itemsPerColumn={6}
                                            interactive={!sectionLoading}
                                            itemLoading={sectionLoading}
                                            enablePrimaryPlay
                                            getActions={
                                                getRecentlyPlayedActions
                                            }
                                        />
                                    );
                                }}
                            />
                        </Tabs.Content>
                    </Tabs.Root>
                </Flex>
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
