import { Fragment, ReactNode, useMemo } from 'react';
import {
    PauseIcon,
    PlayIcon,
    TrackNextIcon,
    TrackPreviousIcon,
    ShuffleIcon,
    LoopIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ListBulletIcon,
} from '@radix-ui/react-icons';
import { Flex, IconButton, Separator, Text, Tooltip } from '@radix-ui/themes';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';
import { MdMusicNote } from 'react-icons/md';

import { episodeToItem, artistToItem, trackToItem } from '../../shared/media';
import { asEpisode, asTrack } from '../../shared/types';
import {
    MEDIA_CACHE_KEYS,
    type NowPlayingCacheEntry,
} from '../hooks/mediaCacheEntries';
import { useHistory } from '../hooks/useHistory';
import { useMediaCacheEntry } from '../hooks/useMediaCache';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import { buildMediaRouteFromItem } from '../hooks/useMediaRoute';
import { usePlayer } from '../hooks/usePlayer';
import { useRouteToggle } from '../hooks/useRouteToggle';

import { AvatarButton } from './AvatarButton';
import { BackgroundImage } from './BackgroundImage';
import { Fade } from './Fade';
import { IconToggle } from './IconToggle';
import { Marquee } from './Marquee';
import { SeekSlider } from './SeekSlider';
import { SkeletonText } from './SkeletonText';
import { TextButton } from './TextButton';
import { VolumeSlider } from './VolumeSlider';

interface Props {
    profileSlot?: ReactNode;
    navSlot?: ReactNode;
    expanded: boolean;
    onExpandedChange: (value: boolean) => void;
    onOpenMediaRoute?: (route: MediaRouteState) => void;
}

export function PlaybackBar({
    profileSlot,
    navSlot,
    expanded,
    onExpandedChange,
    onOpenMediaRoute,
}: Props) {
    const {
        playback,
        isPlaying,
        controls,
        isShuffle,
        repeatMode,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canSeek,
        canTogglePlay,
        pendingItemChange,
    } = usePlayer();
    const cachedNowPlaying = useMediaCacheEntry<NowPlayingCacheEntry>(
        MEDIA_CACHE_KEYS.nowPlaying
    );
    const cachedNowPlayingItem = cachedNowPlaying?.item ?? null;
    const { isActive: isLyricsRoute, toggle: toggleLyricsRoute } =
        useRouteToggle('/lyrics', { fallbackPath: '/' });
    const { isActive: isQueueRoute, toggle: toggleQueueRoute } = useRouteToggle(
        '/queue',
        { fallbackPath: '/' }
    );
    const routeHistory = useHistory();

    const playbackItem = useMemo(() => {
        if (pendingItemChange && cachedNowPlayingItem) {
            return cachedNowPlayingItem;
        }
        if (playback === undefined) {
            return cachedNowPlayingItem ?? undefined;
        }
        return playback?.item ?? cachedNowPlayingItem ?? undefined;
    }, [cachedNowPlayingItem, pendingItemChange, playback]);
    const loading = !playbackItem;
    const playbackReady = playback !== undefined;

    const track = asTrack(playbackItem);
    const episode = asEpisode(playbackItem);

    const title = playbackItem?.name ?? '';
    const skeletonLabel = '\u00A0';
    const titleLabel = title.trim() || skeletonLabel;
    const artists: (SimplifiedArtist | SimplifiedShow)[] = useMemo(() => {
        if (track?.artists) return track.artists;
        if (episode?.show) return [episode.show];
        return [{ name: '' }] as SimplifiedArtist[];
    }, [track?.artists, episode?.show]);
    const artistLabels = useMemo(
        () =>
            artists.map((artist) =>
                'publisher' in artist ? artist.publisher : artist.name
            ),
        [artists]
    );
    const subtitleLabel = useMemo(() => {
        const joined = artistLabels.filter(Boolean).join(', ');
        return joined || skeletonLabel;
    }, [artistLabels]);

    const albumImage =
        track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;
    const heroImage =
        track?.album?.images?.[0]?.url ??
        episode?.show?.images?.[0]?.url ??
        episode?.images?.[0]?.url;
    const repeatActive = repeatMode !== 'off';

    const handlePlayPause = () => {
        if (isPlaying) void controls.pause();
        else void controls.play();
    };

    const handleOpenMedia = () => {
        const item = track
            ? trackToItem(track)
            : episode
              ? episodeToItem(episode, undefined, episode.show)
              : null;
        const route = item ? buildMediaRouteFromItem(item) : null;
        if (!route) return;
        if (onOpenMediaRoute) {
            onOpenMediaRoute(route);
            return;
        }
        routeHistory.goTo('/media', route, { samePathBehavior: 'replace' });
    };

    const handleOpenArtist = (artist: SimplifiedArtist | SimplifiedShow) => {
        if (!('id' in artist) || !artist.id) return;
        if ('publisher' in artist) {
            const route: MediaRouteState = { kind: 'show', id: artist.id };
            if (onOpenMediaRoute) {
                onOpenMediaRoute(route);
            } else {
                routeHistory.goTo('/media', route, {
                    samePathBehavior: 'replace',
                });
            }
            return;
        }
        const item = artistToItem(artist);
        const route = buildMediaRouteFromItem(item);
        if (!route) return;
        if (onOpenMediaRoute) {
            onOpenMediaRoute(route);
        } else {
            routeHistory.goTo('/media', route, {
                samePathBehavior: 'replace',
            });
        }
    };

    return (
        <BackgroundImage
            direction="column"
            gap="2"
            flexGrow="1"
            className={clsx('relative overflow-hidden text-white')}
            imageUrl={heroImage}
            gradient="linear-gradient(120deg, rgba(5,7,14,0.9), rgba(9,12,22,0.7))"
            zoom={1.06}
            position="center 24%"
            blur={2}
        >
            <Flex
                direction="column"
                gap="2"
                p="2"
                pb={expanded ? '1' : '2'}
                flexGrow="1"
                className="z-10"
            >
                <Flex
                    direction="column"
                    flexGrow="1"
                    gap="1"
                    className="relative"
                >
                    <Flex direction="row" align="center" gap="2" flexGrow="1">
                        {/* Album + pause/play */}
                        <AvatarButton
                            avatar={{
                                src: albumImage,
                                fallback: <MdMusicNote />,
                                radius: 'small',
                                size: '4',
                            }}
                            aria-label={
                                isPlaying ? 'Pause playback' : 'Start playback'
                            }
                            onClick={handlePlayPause}
                            disabled={!playbackReady || !canTogglePlay}
                            className="group p-0"
                            overlayPointerEvents="none"
                        >
                            {albumImage && (
                                <Flex
                                    align="center"
                                    justify="center"
                                    className="pointer-events-none absolute inset-0"
                                >
                                    <Flex
                                        className="bg-panel-solid/10 rounded-full text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                                        p="1"
                                    >
                                        {isPlaying ? (
                                            <PauseIcon />
                                        ) : (
                                            <PlayIcon />
                                        )}
                                    </Flex>
                                </Flex>
                            )}
                        </AvatarButton>

                        <Flex
                            direction="column"
                            flexGrow="1"
                            className="group min-w-0"
                        >
                            <Flex align="center" flexGrow="1">
                                {/* Title */}
                                <Fade enabled={!loading} grow>
                                    <Marquee mode="bounce" grow>
                                        <SkeletonText
                                            loading={loading}
                                            preset="media-row"
                                            variant="title"
                                            className="w-fit"
                                        >
                                            {loading ? (
                                                <Text size="3" weight="bold">
                                                    {titleLabel}
                                                </Text>
                                            ) : (
                                                <TextButton
                                                    size="3"
                                                    weight="bold"
                                                    onClick={handleOpenMedia}
                                                >
                                                    {titleLabel}
                                                </TextButton>
                                            )}
                                        </SkeletonText>
                                    </Marquee>
                                </Fade>
                            </Flex>

                            <Flex align="center" gap="1">
                                {/* Artists */}
                                <Fade enabled={!loading} grow>
                                    <Marquee mode="right" grow>
                                        <SkeletonText
                                            loading={loading}
                                            preset="media-row"
                                            variant="subtitle"
                                            className="w-fit"
                                        >
                                            {loading ? (
                                                <Text size="2" color="gray">
                                                    {subtitleLabel}
                                                </Text>
                                            ) : (
                                                <Flex
                                                    align="center"
                                                    className="min-w-0"
                                                >
                                                    {artists.map(
                                                        (artist, index) => {
                                                            const label =
                                                                artistLabels[
                                                                    index
                                                                ] ?? '';
                                                            const canOpenArtist =
                                                                Boolean(
                                                                    'id' in
                                                                        artist &&
                                                                        artist.id
                                                                );

                                                            return (
                                                                <Fragment
                                                                    key={`${artist.id ?? label}-${index}`}
                                                                >
                                                                    <TextButton
                                                                        size="2"
                                                                        color="gray"
                                                                        interactive={
                                                                            canOpenArtist
                                                                        }
                                                                        onClick={
                                                                            canOpenArtist
                                                                                ? () =>
                                                                                      handleOpenArtist(
                                                                                          artist
                                                                                      )
                                                                                : undefined
                                                                        }
                                                                    >
                                                                        {label ||
                                                                            skeletonLabel}
                                                                    </TextButton>
                                                                    {index <
                                                                        artists.length -
                                                                            1 && (
                                                                        <Text
                                                                            as="span"
                                                                            size="2"
                                                                            color="gray"
                                                                        >
                                                                            {
                                                                                ',\u00A0'
                                                                            }
                                                                        </Text>
                                                                    )}
                                                                </Fragment>
                                                            );
                                                        }
                                                    )}
                                                </Flex>
                                            )}
                                        </SkeletonText>
                                    </Marquee>
                                </Fade>

                                {/* Previous button */}
                                <Tooltip
                                    content="Previous track"
                                    className="shadow-lg"
                                >
                                    <IconButton
                                        variant="ghost"
                                        radius="full"
                                        size="1"
                                        onClick={controls.previous}
                                        aria-label="Previous track"
                                        disabled={
                                            !playbackReady || !canSkipPrevious
                                        }
                                    >
                                        <TrackPreviousIcon />
                                    </IconButton>
                                </Tooltip>

                                {/* Next button */}
                                <Tooltip
                                    content="Next track"
                                    className="shadow-lg"
                                >
                                    <IconButton
                                        variant="ghost"
                                        radius="full"
                                        size="1"
                                        onClick={controls.next}
                                        aria-label="Next track"
                                        disabled={
                                            !playbackReady || !canSkipNext
                                        }
                                    >
                                        <TrackNextIcon />
                                    </IconButton>
                                </Tooltip>
                            </Flex>
                        </Flex>

                        {profileSlot}

                        {navSlot}
                    </Flex>

                    <Flex direction="row" align="center" gap="1">
                        <VolumeSlider />
                        <SeekSlider disabled={!playbackReady || !canSeek} />
                    </Flex>

                    <button
                        type="button"
                        className={clsx(
                            'absolute -bottom-2 left-1/2 flex h-2.5 w-20 -translate-x-1/2 items-center justify-center rounded-t-md border border-b-0 border-white/10 text-white/55 transition-colors',
                            'hover:border-white/20 hover:text-white/85',
                            'focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:outline-none'
                        )}
                        onClick={() => onExpandedChange(!expanded)}
                        aria-pressed={expanded}
                        aria-label={
                            expanded ? 'Collapse playback' : 'Expand playback'
                        }
                    >
                        {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </button>
                </Flex>

                {expanded && (
                    <Flex direction="column" gap="1">
                        <Separator size="4" />
                        <Flex align="center" justify="end" gap="1">
                            <Tooltip content="Queue" className="shadow-lg">
                                <IconButton
                                    variant="ghost"
                                    radius="full"
                                    size="1"
                                    onClick={toggleQueueRoute}
                                    aria-pressed={isQueueRoute}
                                    aria-label="Toggle queue view"
                                >
                                    <ListBulletIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip content="Shuffle" className="shadow-lg">
                                <IconToggle
                                    variant="ghost"
                                    radius="full"
                                    size="1"
                                    isPressed={isShuffle}
                                    onClick={controls.toggleShuffle}
                                    aria-label="Toggle shuffle"
                                    disabled={!playbackReady || !canShuffle}
                                >
                                    <ShuffleIcon />
                                </IconToggle>
                            </Tooltip>

                            <Tooltip content="Repeat" className="shadow-lg">
                                <IconToggle
                                    variant="ghost"
                                    radius="full"
                                    size="1"
                                    isPressed={repeatActive}
                                    onClick={controls.toggleRepeat}
                                    aria-label="Toggle repeat"
                                    disabled={!playbackReady || !canRepeat}
                                >
                                    <LoopIcon />
                                </IconToggle>
                            </Tooltip>

                            <Tooltip content="Lyrics" className="shadow-lg">
                                <IconButton
                                    variant="ghost"
                                    radius="full"
                                    size="1"
                                    onClick={toggleLyricsRoute}
                                    aria-pressed={isLyricsRoute}
                                    aria-label="Toggle lyrics view"
                                >
                                    <MdMusicNote />
                                </IconButton>
                            </Tooltip>
                        </Flex>
                    </Flex>
                )}
            </Flex>
        </BackgroundImage>
    );
}
