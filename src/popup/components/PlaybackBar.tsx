import { Flex, Link, Text } from '@radix-ui/themes';
import { PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import { MdMusicNote } from 'react-icons/md';
import { asEpisode, asTrack } from '../../shared/types';
import { usePlayer } from '../hooks/usePlayer';
import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';
import { AvatarButton } from './AvatarButton';
import { ExternalLink } from './ExternalLink';
import { useRef, useState } from 'react';

export function PlaybackBar() {
    const { playback, controls } = usePlayer(5000);

    const [expanded, setExpanded] = useState(false);

    const loading = playback === undefined;

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const isPlaying = playback?.is_playing ?? false;
    const title = playback?.item?.name ?? 'Suck Deez WRahhhh aahhh';
    const link = playback?.item?.external_urls?.spotify;

    const artists: (SimplifiedArtist | SimplifiedShow)[] =
        track?.artists ?? (episode?.show ? [episode.show] : []);

    const albumImage =
        track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;
    const bgImage = albumImage;

    const durationMs = playback?.item?.duration_ms ?? 0;
    const progressMs = playback?.progress_ms ?? 0;

    const volumePercent = playback?.device?.volume_percent ?? 100;
    const lastNonZero = useRef(volumePercent);

    const isMuted = volumePercent === 0;
    if (!isMuted) lastNonZero.current = volumePercent;

    return (
        // className="relative bg-cover bg-center"
        <>
            {/* Album Cover */}
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

            <Flex className="overflow-hidden">
                {/* Title */}
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
            </Flex>

            <Flex className="overflow-hidden">
                {/* Artists */}
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
        </>
    );

    /*const name = playback?.item?.name ?? 'Suck Deez';
    const artist =
        track?.artists.map((artist) => artist.name).join(', ') ??
        episode?.show?.publisher ??
        'John Does Nuts';
    const image = track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;
    const link = playback?.item?.external_urls?.spotify;
    const durationms = playback?.item?.duration_ms ?? 0;

    return (
        <Grid columns="2fr 1fr 2fr" align="center" justify="between">
            {/!* Left: Info *!/}
            <Flex gap="2" align="start" overflow="hidden">
                <Skeleton loading={loading}>
                    <Avatar
                        fallback={<MdMusicNote />}
                        radius="small"
                        src={image}
                        className={'cursor-pointer'}
                        asChild
                    >
                        <IconButton
                            onClick={() => link && window.open(link, '_blank')}
                        />
                    </Avatar>
                </Skeleton>
                <Flex direction="column" align="start" overflow="hidden">
                    <Skeleton loading={loading}>
                        <Text size="3" weight="bold" truncate>
                            {name}
                        </Text>
                    </Skeleton>
                    <Skeleton loading={loading}>
                        <Text size="1" color="gray" truncate>
                            {artist}
                        </Text>
                    </Skeleton>
                </Flex>
            </Flex>

            {/!* Center: Controls *!/}
            <Flex align="center" justify="center" gap="1">
                <IconButton
                    variant="ghost"
                    size="1"
                    radius="full"
                    onClick={previous}
                >
                    <TrackPreviousIcon />
                </IconButton>

                <IconButton
                    size="2"
                    radius="full"
                    onClick={playback?.is_playing ? pause : play}
                >
                    {playback?.is_playing ? <PauseIcon /> : <PlayIcon />}
                </IconButton>

                <IconButton
                    variant="ghost"
                    size="1"
                    radius="full"
                    onClick={next}
                >
                    <TrackNextIcon />
                </IconButton>
            </Flex>

            {/!* Right: Context *!/}
            <Flex justify="end" align="end" gap="3">
                <IconButton
                    size="1"
                    variant="ghost"
                    onClick={() => navigate('/lyrics')}
                >
                    <MdQueueMusic />
                </IconButton>
            </Flex>
        </Grid>
    );*/
}
