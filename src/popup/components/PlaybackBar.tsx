import { Flex, IconButton, Avatar, Text } from '@radix-ui/themes';
import { PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import { MdMusicNote } from 'react-icons/md';
import { asEpisode, asTrack } from '../../shared/types';
import { usePlayer } from '../hooks/usePlayer';
import { FadeMask } from './FadeMask';
import { Scrollable } from './Scrollable';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';
import { AvatarButton } from './AvatarButton';

export function PlaybackBar() {
    const { playback, controls } = usePlayer(5000);

    const loading = playback === undefined;

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const isPlaying = playback?.is_playing ?? false;
    const title = playback?.item?.name ?? 'Suck Deez';
    const artists: (SimplifiedArtist | SimplifiedShow)[] =
        track?.artists ?? (episode?.show ? [episode.show] : []);
    const albumImage =
        track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;
    const bgImage = albumImage;

    return (
        <Flex className="relative overflow-hidden bg-cover bg-center">
            {/* Album Cover */}
            <AvatarButton
                src={albumImage}
                fallback={<MdMusicNote />}
                radius="small"
                onClick={isPlaying ? controls.pause : controls.play}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </AvatarButton>

            <Flex>
                {/* Title */}
                <FadeMask>
                    <Scrollable>
                        <Text
                            size="3"
                            weight="bold"
                            onClick={() =>
                                window.open(
                                    track?.external_urls?.spotify,
                                    '_blank'
                                )
                            }
                        >
                            {title}
                        </Text>
                    </Scrollable>
                </FadeMask>

                {/* Action Menu */}
            </Flex>

            <Flex>
                {/* Artists */}
                <FadeMask>
                    <Scrollable>
                        {artists.map((artist) => {
                            const label =
                                'publisher' in artist
                                    ? artist.publisher
                                    : artist.name;

                            return (
                                <Text
                                    size="2"
                                    onClick={() =>
                                        window.open(
                                            artist?.external_urls?.spotify,
                                            '_blank'
                                        )
                                    }
                                >
                                    {label}
                                </Text>
                            );
                        })}
                    </Scrollable>
                </FadeMask>
            </Flex>
        </Flex>
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
