import { Flex, IconButton } from '@radix-ui/themes';
import { PauseIcon, PlayIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { MdMusicNote } from 'react-icons/md';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';

import { usePlayer } from '../hooks/usePlayer';
import { asEpisode, asTrack } from '../../shared/types';

import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { ExternalLink } from './ExternalLink';
import { AvatarButton } from './AvatarButton';
import { VolumeControl } from './VolumeControl';
import { SeekControl } from './SeekControl';

interface Props {
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
}

export function SimpleBar({ expanded, setExpanded }: Props) {
    const { playback, isPlaying, controls } = usePlayer();

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const title = playback?.item?.name ?? '';
    const link = playback?.item?.external_urls?.spotify;

    const artists: (SimplifiedArtist | SimplifiedShow)[] =
        track?.artists ?? (episode?.show ? [episode.show] : []);

    const albumImage =
        track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;

    const progressMs = playback?.progress_ms ?? 0;
    const durationMs =
        (playback?.item as any)?.duration_ms ??
        track?.duration_ms ??
        episode?.duration_ms ??
        0;

    return (
        <div className="simplebar-shell relative w-full overflow-hidden rounded-md">
            {/* Blurred album background */}
            {albumImage && (
                <div
                    className="pointer-events-none absolute inset-0 -z-20 scale-110 bg-cover bg-center blur-xl"
                    style={{ backgroundImage: `url(${albumImage})` }}
                />
            )}
            {/* Dark glass overlay with right fade */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-black/60 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

            <Flex
                direction="column"
                gap="2"
                className="relative z-10 w-full px-3 py-2 select-none"
            >
                {/* Top row: album, text, controls */}
                <Flex align="center" gap="2" className="overflow-hidden">
                    {/* Album cover with hover play/pause overlay */}
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

                    {/* Title + artists */}
                    <Flex
                        direction="column"
                        flexGrow="1"
                        className="overflow-hidden"
                    >
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
                                            key={artist.id ?? label}
                                            noAccent
                                            size="2"
                                            href={
                                                artist?.external_urls?.spotify
                                            }
                                        >
                                            {label}
                                        </ExternalLink>
                                    );
                                })}
                            </Marquee>
                        </Fade>
                    </Flex>

                    {/* Simple controls on the right */}
                    <Flex align="center" gap="1">
                        <IconButton
                            variant="ghost"
                            radius="full"
                            size="1"
                            onClick={controls.previous}
                        >
                            {/* Using same icons as before */}
                            {/* TrackPreviousIcon imported in parent if you prefer */}
                            {/* or keep imports here */}
                        </IconButton>

                        <IconButton
                            variant="ghost"
                            radius="full"
                            size="1"
                            onClick={controls.next}
                        >
                            {/* TrackNextIcon */}
                        </IconButton>

                        <IconButton
                            variant="ghost"
                            radius="full"
                            size="1"
                            onClick={() => setExpanded(!expanded)}
                        >
                            <DotsHorizontalIcon />
                        </IconButton>
                    </Flex>
                </Flex>

                {/* Second row: volume + seek bar */}
                <Flex align="center" gap="3">
                    <VolumeControl />

                    <SeekControl
                        currentMs={progressMs ?? 0}
                        durationMs={durationMs ?? 0}
                        onSeek={(ms) => controls.seek?.(ms)}
                    />
                </Flex>
            </Flex>
        </div>
    );
}
