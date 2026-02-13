import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import type { Episode, Track } from '@spotify/web-api-ts-sdk';

import { safeRequest } from '../../shared/async';
import { resolveLocale } from '../../shared/locale';
import { createLogger, logError } from '../../shared/logging';
import { episodeToItem, trackToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaItem } from '../../shared/types';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { MediaShelf } from '../components/MediaShelf';
import { SkeletonText } from '../components/SkeletonText';
import { usePlayer } from '../hooks/usePlayer';
import { useSettings } from '../hooks/useSettings';

const logger = createLogger('queue');
const POLL_MS = 5000;

type QueueState = {
    current: MediaItem | null;
    queue: MediaItem[];
};

const isEpisodeItem = (item: Track | Episode): item is Episode =>
    item.type === 'episode' || 'show' in item;

const mapQueueItem = (item: Track | Episode, locale: string): MediaItem => {
    if (isEpisodeItem(item)) {
        return episodeToItem(item, locale, item.show);
    }
    return trackToItem(item);
};

export function QueueView() {
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);
    const { playback } = usePlayer();
    const [queueState, setQueueState] = useState<QueueState | null>(null);
    const [loading, setLoading] = useState(true);
    const skeletonLabel = '\u00A0';

    const loadQueue = useCallback(async () => {
        const data = await safeRequest(
            () => sendSpotifyMessage('getQueue'),
            null,
            (error) => logError(logger, 'Failed to load queue', error)
        );
        if (!data) {
            setQueueState({ current: null, queue: [] });
            setLoading(false);
            return;
        }
        const currentItem = data.currently_playing
            ? mapQueueItem(data.currently_playing, locale)
            : playback?.item
              ? mapQueueItem(playback.item as Track | Episode, locale)
              : null;
        const queueItems = data.queue?.map((item) =>
            mapQueueItem(item as Track | Episode, locale)
        );
        setQueueState({
            current: currentItem,
            queue: queueItems ?? [],
        });
        setLoading(false);
    }, [locale, playback?.item]);

    useEffect(() => {
        setLoading(true);
        void loadQueue();
        const timer = window.setInterval(() => {
            void loadQueue();
        }, POLL_MS);
        return () => window.clearInterval(timer);
    }, [loadQueue]);

    const skeletonRows = useMemo(
        () =>
            Array.from({ length: 6 }, (_, index) => ({
                id: `skeleton-${index}`,
                title: skeletonLabel,
                subtitle: skeletonLabel,
            })),
        [skeletonLabel]
    );

    if (!queueState && loading) {
        return (
            <Flex p="3" direction="column" gap="2">
                <SkeletonText
                    loading
                    parts={[skeletonLabel]}
                    preset="media-row"
                    variant="title"
                >
                    <Text size="5" weight="bold">
                        {skeletonLabel}
                    </Text>
                </SkeletonText>
                <SkeletonText
                    loading
                    parts={[skeletonLabel]}
                    preset="media-row"
                    variant="subtitle"
                >
                    <Text size="2" color="gray">
                        {skeletonLabel}
                    </Text>
                </SkeletonText>
            </Flex>
        );
    }

    const nowPlaying = queueState?.current;
    const upcoming = queueState?.queue ?? [];

    return (
        <Flex
            pl="3"
            py="3"
            direction="column"
            gap="4"
            className="scrollbar-gutter-stable min-h-0 overflow-y-auto"
        >
            <Flex direction="column" gap="2">
                <Text size="3" weight="bold">
                    Now playing
                </Text>
                {nowPlaying ? (
                    <MediaShelf
                        items={[nowPlaying]}
                        variant="list"
                        orientation="vertical"
                        itemsPerColumn={1}
                        interactive={!loading}
                        itemLoading={loading}
                    />
                ) : (
                    <Text size="2" color="gray">
                        Nothing is playing right now.
                    </Text>
                )}
            </Flex>

            <MediaSection
                editing={false}
                loading={loading}
                section={
                    {
                        id: 'queue-up-next',
                        title: 'Up next',
                        view: 'list',
                        infinite: 'rows',
                        rows: 0,
                        items: loading ? skeletonRows : upcoming,
                    } satisfies MediaSectionState
                }
                onChange={() => undefined}
            />
        </Flex>
    );
}
