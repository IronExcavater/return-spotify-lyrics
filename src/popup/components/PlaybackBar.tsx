import { useState } from 'react';
import { Flex, IconButton, Slider } from '@radix-ui/themes';
import {
    PauseIcon,
    PlayIcon,
    TrackNextIcon,
    TrackPreviousIcon,
    SpeakerOffIcon,
    SpeakerLoudIcon,
    ShuffleIcon,
    LoopIcon,
    DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import { MdMusicNote } from 'react-icons/md';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';

import { usePlayer } from '../hooks/usePlayer';
import { asEpisode, asTrack } from '../../shared/types';

import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { ExternalLink } from './ExternalLink';
import { AvatarButton } from './AvatarButton';

export function PlaybackBar() {
    const {
        playback,
        isPlaying,
        durationMs,
        progressMs,
        volumePercent,
        muted,
        isShuffle,
        repeatMode,
        controls,
    } = usePlayer(4000);

    const [expanded, setExpanded] = useState(false);

    const loading = playback === undefined;

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const title = playback?.item?.name ?? '';
    const link = playback?.item?.external_urls?.spotify;

    const artists: (SimplifiedArtist | SimplifiedShow)[] =
        track?.artists ?? (episode?.show ? [episode.show] : []);

    const albumImage =
        track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;
    const bgImage = albumImage;

    return (
        <Flex direction="column" gap="2" className="w-full select-none">
            <Flex align="center" gap="2" className="overflow-hidden">
                <AvatarButton
                    avatar={{
                        src: albumImage,
                        fallback: <MdMusicNote />,
                        radius: 'small',
                        onClick: isPlaying ? controls.pause : controls.play,
                    }}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </AvatarButton>

                <Flex direction="column" flexGrow="1" overflow="hidden">
                    <Fade>
                        <Marquee mode="bounce">
                            <ExternalLink
                                noAccent
                                size="3"
                                weight="bold"
                                href={link}
                            >
                                {title}
                            </ExternalLink>
                        </Marquee>
                    </Fade>

                    <Fade>
                        <Marquee mode="right">
                            {artists.map((artist) => {
                                const label =
                                    'publisher' in artist
                                        ? artist.publisher
                                        : artist.name;

                                return (
                                    <ExternalLink
                                        noAccent
                                        size="2"
                                        href={artist?.external_urls?.spotify}
                                    >
                                        {label}
                                    </ExternalLink>
                                );
                            })}
                        </Marquee>
                    </Fade>
                </Flex>

                <IconButton
                    variant="ghost"
                    radius="full"
                    size="1"
                    onClick={() => setExpanded((v) => !v)}
                >
                    <DotsHorizontalIcon />
                </IconButton>
            </Flex>

            {expanded && (
                <Flex
                    direction="column"
                    gap="3"
                    px="2"
                    py="2"
                    style={{ borderTop: '1px solid var(--gray-a6)' }}
                >
                    <Flex align="center" justify="center" gap="2">
                        <IconButton
                            variant="ghost"
                            radius="full"
                            size="1"
                            onClick={controls.previous}
                        >
                            <TrackPreviousIcon />
                        </IconButton>

                        <IconButton
                            radius="full"
                            size="2"
                            onClick={isPlaying ? controls.pause : controls.play}
                        >
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </IconButton>

                        <IconButton
                            variant="ghost"
                            radius="full"
                            size="1"
                            onClick={controls.next}
                        >
                            <TrackNextIcon />
                        </IconButton>
                    </Flex>

                    <Flex align="center" gap="3">
                        <IconButton onClick={controls.toggleMute}>
                            {muted ? <SpeakerOffIcon /> : <SpeakerLoudIcon />}
                        </IconButton>

                        <Slider
                            value={[muted ? 0 : volumePercent]}
                            onValueChange={(v) => controls.setVolume(v[0] ?? 0)}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                        />
                    </Flex>

                    <Flex align="center" justify="center" gap="3">
                        <IconButton onClick={controls.toggleShuffle}>
                            <ShuffleIcon />
                        </IconButton>

                        <IconButton onClick={controls.toggleRepeat}>
                            <LoopIcon
                                style={{
                                    opacity: repeatMode === 'off' ? 0.5 : 1,
                                }}
                            />
                        </IconButton>
                    </Flex>
                </Flex>
            )}
        </Flex>
    );
}
