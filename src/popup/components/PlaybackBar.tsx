import { ReactNode, useMemo } from 'react';
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
import { Flex, IconButton, Skeleton, Separator } from '@radix-ui/themes';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';
import { MdMusicNote } from 'react-icons/md';

import { episodeToItem, artistToItem, trackToItem } from '../../shared/media';
import { asEpisode, asTrack } from '../../shared/types';
import { useHistory } from '../hooks/useHistory';
import { buildMediaRouteFromItem } from '../hooks/useMediaRoute';
import { usePlayer } from '../hooks/usePlayer';
import { useRouteToggle } from '../hooks/useRouteToggle';

import { AvatarButton } from './AvatarButton';
import { BackgroundImage } from './BackgroundImage';
import { Fade } from './Fade';
import { IconToggle } from './IconToggle';
import { Marquee } from './Marquee';
import { PlaybackSeek } from './PlaybackSeek';
import { PlaybackVolume } from './PlaybackVolume';
import { TextButton } from './TextButton';

interface Props {
    profileSlot?: ReactNode;
    navSlot?: ReactNode;
    expanded: boolean;
    onExpandedChange: (value: boolean) => void;
}

export function PlaybackBar({
    profileSlot,
    navSlot,
    expanded,
    onExpandedChange,
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
    } = usePlayer();
    const { isActive: isLyricsRoute, toggle: toggleLyricsRoute } =
        useRouteToggle('/lyrics', { fallbackPath: '/' });
    const { isActive: isQueueRoute, toggle: toggleQueueRoute } = useRouteToggle(
        '/queue',
        { fallbackPath: '/' }
    );
    const routeHistory = useHistory();

    const loading = playback === undefined;

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const title = playback?.item?.name ?? 'Placeholder';
    const artists: (SimplifiedArtist | SimplifiedShow)[] = useMemo(() => {
        if (track?.artists) return track.artists;
        if (episode?.show) return [episode.show];
        return [
            { name: 'Placeholder' },
            { name: 'Faker' },
        ] as SimplifiedArtist[];
    }, [track?.artists, episode?.show]);

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
        routeHistory.goTo('/media', route, { samePathBehavior: 'replace' });
    };

    const handleOpenArtist = (artist: SimplifiedArtist | SimplifiedShow) => {
        if (!('id' in artist) || !artist.id) return;
        if ('publisher' in artist) {
            routeHistory.goTo(
                '/media',
                { kind: 'show', id: artist.id },
                { samePathBehavior: 'replace' }
            );
            return;
        }
        const item = artistToItem(artist);
        const route = buildMediaRouteFromItem(item);
        if (!route) return;
        routeHistory.goTo('/media', route, { samePathBehavior: 'replace' });
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
                            disabled={loading || !canTogglePlay}
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
                            className="min-w-0"
                        >
                            <Flex align="center" flexGrow="1">
                                {/* Title */}
                                <Fade enabled={!loading} grow>
                                    <Marquee mode="bounce" grow>
                                        <Skeleton loading={loading}>
                                            <TextButton
                                                size="3"
                                                weight="bold"
                                                onClick={handleOpenMedia}
                                            >
                                                {title}
                                            </TextButton>
                                        </Skeleton>
                                    </Marquee>
                                </Fade>
                            </Flex>

                            <Flex align="center" gap="1">
                                {/* Artists */}
                                <Fade enabled={!loading} grow>
                                    <Marquee mode="right" grow>
                                        <Flex align="center" gap="2">
                                            {artists.map((artist) => {
                                                const label =
                                                    'publisher' in artist
                                                        ? artist.publisher
                                                        : artist.name;

                                                return (
                                                    <Skeleton
                                                        loading={loading}
                                                        key={artist.id ?? label}
                                                    >
                                                        <TextButton
                                                            size="2"
                                                            color="gray"
                                                            onClick={() =>
                                                                handleOpenArtist(
                                                                    artist
                                                                )
                                                            }
                                                        >
                                                            {label}
                                                        </TextButton>
                                                    </Skeleton>
                                                );
                                            })}
                                        </Flex>
                                    </Marquee>
                                </Fade>

                                {/* Previous button */}
                                <IconButton
                                    variant="ghost"
                                    radius="full"
                                    size="1"
                                    onClick={controls.previous}
                                    aria-label="Previous track"
                                    disabled={!canSkipPrevious}
                                >
                                    <TrackPreviousIcon />
                                </IconButton>

                                {/* Next button */}
                                <IconButton
                                    variant="ghost"
                                    radius="full"
                                    size="1"
                                    onClick={controls.next}
                                    aria-label="Next track"
                                    disabled={!canSkipNext}
                                >
                                    <TrackNextIcon />
                                </IconButton>
                            </Flex>
                        </Flex>

                        {profileSlot}

                        {navSlot}
                    </Flex>

                    <Flex direction="row" align="center" gap="1">
                        <PlaybackVolume />
                        <PlaybackSeek disabled={!canSeek} />
                    </Flex>

                    <button
                        type="button"
                        className={clsx(
                            'bg-panel-solid/30 absolute -bottom-2 left-1/2 flex h-2.5 w-20 -translate-x-1/2 items-center justify-center rounded-t-md border border-b-0 border-white/10 text-white/55 backdrop-blur transition-colors',
                            'hover:bg-panel-solid/45 hover:border-white/20 hover:text-white/85',
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
                            <IconToggle
                                variant="ghost"
                                radius="full"
                                size="1"
                                isPressed={isShuffle}
                                onClick={controls.toggleShuffle}
                                aria-label="Toggle shuffle"
                                disabled={!canShuffle}
                            >
                                <ShuffleIcon />
                            </IconToggle>

                            <IconToggle
                                variant="ghost"
                                radius="full"
                                size="1"
                                isPressed={repeatActive}
                                onClick={controls.toggleRepeat}
                                aria-label="Toggle repeat"
                                disabled={!canRepeat}
                            >
                                <LoopIcon />
                            </IconToggle>

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
                        </Flex>
                    </Flex>
                )}
            </Flex>
        </BackgroundImage>
    );
}
