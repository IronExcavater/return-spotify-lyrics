import { ReactNode, useMemo, useState } from 'react';
import {
    PauseIcon,
    PlayIcon,
    DotsHorizontalIcon,
    TrackNextIcon,
    TrackPreviousIcon,
    ShuffleIcon,
    LoopIcon,
} from '@radix-ui/react-icons';
import {
    Button,
    Flex,
    IconButton,
    Skeleton,
    Separator,
} from '@radix-ui/themes';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';
import { MdMusicNote } from 'react-icons/md';

import { asEpisode, asTrack } from '../../shared/types';
import { usePlayer } from '../hooks/usePlayer';
import { useRouteToggle } from '../hooks/useRouteToggle';

import { AvatarButton } from './AvatarButton';
import { ExternalLink } from './ExternalLink';
import { Fade } from './Fade';
import { IconToggle } from './IconToggle';
import { Marquee } from './Marquee';
import { PlaybackSeek } from './PlaybackSeek';
import { PlaybackVolume } from './PlaybackVolume';

interface Props {
    profileSlot?: ReactNode;
    navSlot?: ReactNode;
}

export function PlaybackBar({ profileSlot, navSlot }: Props) {
    const { playback, isPlaying, controls, isShuffle, repeatMode } =
        usePlayer();
    const { isActive: isLyricsRoute, toggle: toggleLyricsRoute } =
        useRouteToggle('/lyrics');
    const [expanded, setExpanded] = useState(false);

    const loading = playback === undefined;

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const title = playback?.item?.name ?? 'Placeholder title which is long';
    const link = playback?.item?.external_urls?.spotify;

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

    return (
        <Flex
            direction="column"
            gap="2"
            flexGrow="1"
            className={clsx('overflow-hidden text-white')}
            style={
                heroImage
                    ? {
                          backgroundImage: `linear-gradient(120deg, rgba(5,7,14,0.9), rgba(9,12,22,0.7)), url(${heroImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                      }
                    : {}
            }
        >
            <Flex direction="column" gap="1" p="2" flexGrow="1">
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
                        disabled={loading}
                        className="group p-0"
                    >
                        {albumImage && (
                            <div className="opacity-0 transition-opacity group-hover:opacity-100">
                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </div>
                        )}
                    </AvatarButton>

                    <Flex direction="column" flexGrow="1" className="min-w-0">
                        <Flex align="center" flexGrow="1">
                            {/* Title */}
                            <Fade className="grow">
                                <div style={{ paddingInline: '4px' }}>
                                    <Marquee mode="bounce">
                                        <Skeleton loading={loading}>
                                            <ExternalLink
                                                noAccent
                                                size="3"
                                                weight="bold"
                                                href={link}
                                            >
                                                {title}
                                            </ExternalLink>
                                        </Skeleton>
                                    </Marquee>
                                </div>
                            </Fade>

                            {/* Expand button */}
                            <IconButton
                                variant="ghost"
                                radius="full"
                                size="1"
                                onClick={() => setExpanded(!expanded)}
                                aria-pressed={expanded}
                            >
                                <DotsHorizontalIcon />
                            </IconButton>
                        </Flex>

                        <Flex align="center" gap="1">
                            {/* Artists */}
                            <Fade className="grow">
                                <div style={{ paddingInline: '4px' }}>
                                    <Marquee mode="right">
                                        <Flex
                                            align="center"
                                            style={{ gap: '8px' }}
                                        >
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
                                                        <ExternalLink
                                                            noAccent
                                                            size="2"
                                                            href={
                                                                artist
                                                                    ?.external_urls
                                                                    ?.spotify
                                                            }
                                                        >
                                                            {label}
                                                        </ExternalLink>
                                                    </Skeleton>
                                                );
                                            })}
                                        </Flex>
                                    </Marquee>
                                </div>
                            </Fade>

                            {/* Previous button */}
                            <IconButton
                                variant="ghost"
                                radius="full"
                                size="1"
                                onClick={controls.previous}
                                aria-label="Previous track"
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
                    <PlaybackSeek />
                </Flex>

                {expanded && (
                    <Flex direction="column" gap="1">
                        <Separator size="4" />
                        <Flex align="center" justify="end" gap="1">
                            <IconToggle
                                variant="ghost"
                                radius="full"
                                size="1"
                                isPressed={isShuffle}
                                onClick={controls.toggleShuffle}
                                aria-label="Toggle shuffle"
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
                            >
                                <LoopIcon />
                            </IconToggle>

                            <Button
                                size="1"
                                variant={isLyricsRoute ? 'solid' : 'surface'}
                                onClick={toggleLyricsRoute}
                                aria-pressed={isLyricsRoute}
                            >
                                Lyrics
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </Flex>
        </Flex>
    );
}
