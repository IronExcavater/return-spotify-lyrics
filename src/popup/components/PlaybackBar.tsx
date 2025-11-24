import {
    Flex,
    IconButton,
    Avatar,
    Skeleton,
    Text,
    Grid,
} from '@radix-ui/themes';
import {
    PauseIcon,
    PlayIcon,
    TrackNextIcon,
    TrackPreviousIcon,
} from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';
import { MdMusicNote, MdQueueMusic } from 'react-icons/md';
import { asEpisode, asTrack } from '../../shared/types';
import { PlaybackState } from '@spotify/web-api-ts-sdk';

interface Props {
    playback: PlaybackState | null;
    play: () => void;
    pause: () => void;
    next: () => void;
    previous: () => void;
    seek: (positionMs: number) => void;
    shuffle: () => void;
}

export function PlaybackBar({
    playback,
    play,
    pause,
    next,
    previous,
    seek,
    shuffle,
}: Props) {
    const navigate = useNavigate();

    if (!playback) return <></>;

    const loading = !playback?.item;

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const name = playback?.item?.name ?? 'Suck Deez';
    const artist =
        track?.artists.map((artist) => artist.name).join(', ') ??
        episode?.show?.publisher ??
        'John Does Nuts';
    const image = track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;
    const link = playback?.item?.external_urls?.spotify;
    const durationms = playback?.item?.duration_ms ?? 0;

    return (
        <Grid
            columns="2fr 1fr 2fr"
            px="3"
            py="2"
            align="center"
            justify="between"
            style={{
                borderTop: '1px solid var(--gray-a6)',
                background: 'var(--color-panel-solid)',
                backdropFilter: 'blur(8px)',
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
            }}
        >
            {/* Left: Info */}
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

            {/* Center: Controls */}
            <Flex align="center" justify="center" gap="2">
                <IconButton
                    variant="ghost"
                    size="2"
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
                    size="2"
                    radius="full"
                    onClick={next}
                >
                    <TrackNextIcon />
                </IconButton>
            </Flex>

            {/* Right: Context */}
            <Flex justify="end" align="end" gap="3">
                <IconButton
                    size="2"
                    variant="ghost"
                    onClick={() => navigate('/lyrics')}
                >
                    <MdQueueMusic />
                </IconButton>
            </Flex>
        </Grid>
    );
}
