import {
    Button,
    Flex,
    IconButton,
    Skeleton,
    Separator,
} from '@radix-ui/themes';
import {
    PauseIcon,
    PlayIcon,
    DotsHorizontalIcon,
    TrackNextIcon,
    TrackPreviousIcon,
    ShuffleIcon,
    LoopIcon,
} from '@radix-ui/react-icons';
import { MdMusicNote } from 'react-icons/md';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';
import { RefCallback } from 'react';
import clsx from 'clsx';

import { usePlayer } from '../hooks/usePlayer';
import { asEpisode, asTrack } from '../../shared/types';
import { useRouteToggle } from '../hooks/useRouteToggle';

import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { ExternalLink } from './ExternalLink';
import { AvatarButton } from './AvatarButton';
import { SoundDial } from './SoundDial';
import { TimelineRail } from './TimelineRail';
import { IconToggle } from './IconToggle';

interface Props {
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
    profileSlotRef?: RefCallback<HTMLDivElement>;
}

export function PlaybackBar({ expanded, setExpanded, profileSlotRef }: Props) {
    const { playback, isPlaying, controls, isShuffle, repeatMode } =
        usePlayer();
    const { isActive: isLyricsRoute, toggle: toggleLyricsRoute } =
        useRouteToggle('/lyrics');

    const loading = playback === undefined;

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const title = playback?.item?.name ?? 'Placeholder';
    const link = playback?.item?.external_urls?.spotify;

    const artists: (SimplifiedArtist | SimplifiedShow)[] =
        track?.artists ??
        (episode?.show
            ? [episode.show]
            : [{ name: 'Placeholder' } as SimplifiedArtist]);

    const albumImage =
        track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;
    const repeatActive = repeatMode !== 'off';
    const heroImage =
        track?.album?.images?.[0]?.url ??
        episode?.show?.images?.[0]?.url ??
        episode?.images?.[0]?.url;

    return (
        <Flex
            direction="column"
            gap="0"
            flexGrow="1"
            className={clsx('relative overflow-hidden text-white')}
            style={
                heroImage
                    ? {
                          backgroundImage: `linear-gradient(120deg, rgba(5,7,14,0.9), rgba(9,12,22,0.7)), url(${heroImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                      }
                    : {
                          backgroundColor: 'var(--color-panel-solid)',
                      }
            }
        >
            {heroImage && (
                <div className="pointer-events-none absolute inset-0 bg-black/45" />
            )}
            <Flex direction="column" gap="1" p="3" className="relative z-10">
                <Flex direction="row" align="center" gap="1" flexGrow="1">
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
                        onClick={isPlaying ? controls.pause : controls.play}
                        disabled={loading}
                        className="group"
                    >
                        {!loading && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-xs transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </div>
                        )}
                    </AvatarButton>

                    <Flex direction="column" flexGrow="1" className="min-w-0">
                        <Flex direction="row" flexGrow="1">
                            {/* Title */}
                            <Fade className="grow">
                                <Marquee
                                    mode="bounce"
                                    className="mx-1"
                                    gap={12}
                                >
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
                            </Fade>

                            <Flex align="center">
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
                        </Flex>
                        <Flex direction="row" flexGrow="1">
                            {/* Artists */}
                            <Fade className="grow">
                                <Marquee mode="right" className="mx-1" gap={10}>
                                    {artists.map((artist) => {
                                        const label =
                                            'publisher' in artist
                                                ? artist.publisher
                                                : artist.name;

                                        return (
                                            <Skeleton
                                                key={artist.id ?? label}
                                                loading={loading}
                                            >
                                                <ExternalLink
                                                    noAccent
                                                    size="2"
                                                    href={
                                                        artist?.external_urls
                                                            ?.spotify
                                                    }
                                                >
                                                    {label}
                                                </ExternalLink>
                                            </Skeleton>
                                        );
                                    })}
                                </Marquee>
                            </Fade>

                            {/* Previous button */}
                            <IconButton
                                variant="ghost"
                                radius="full"
                                size="1"
                                onClick={controls.previous}
                            >
                                <TrackPreviousIcon />
                            </IconButton>

                            {/* Next button */}
                            <IconButton
                                variant="ghost"
                                radius="full"
                                size="1"
                                onClick={controls.next}
                            >
                                <TrackNextIcon />
                            </IconButton>
                        </Flex>
                    </Flex>

                    <div
                        ref={profileSlotRef}
                        className="flex items-center"
                        style={{ minHeight: 'var(--space-7)' }}
                    />
                </Flex>
                <Flex direction="row" align="center" gap="2" flexGrow="1">
                    <SoundDial />
                    <TimelineRail />
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
                            >
                                <ShuffleIcon />
                            </IconToggle>

                            <IconToggle
                                variant="ghost"
                                radius="full"
                                size="1"
                                isPressed={repeatActive}
                                onClick={controls.toggleRepeat}
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
