import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { usePlayer } from '../hooks/usePlayer';
import { asTrack } from '../../shared/types';
import { ExternalLink } from '../components/ExternalLink';

const FALLBACK_LYRICS = [
    'Falling into midnight lines,',
    'Chasing echoes in neon skies,',
    'Heartbeat drums and whispered rhymes,',
    'Hold your breath, this moment shines.',
];

export function LyricsView() {
    const { playback } = usePlayer();
    const track = asTrack(playback?.item);
    const title = track?.name ?? 'No track playing';
    const artists =
        track?.artists?.map((a) => a.name).join(', ') ?? 'Unknown artist';
    const cover = track?.album?.images?.[0]?.url;
    const link = track?.external_urls?.spotify;

    return (
        <Flex
            direction="column"
            gap="4"
            className="min-h-[280px] bg-gradient-to-b from-[var(--accent-10)]/60 via-black/80 to-black text-white"
            p="4"
        >
            <Flex gap="3" align="center">
                <Box
                    className="h-20 w-20 overflow-hidden rounded-xl border border-white/20 bg-black/40"
                    style={
                        cover
                            ? {
                                  backgroundImage: `url(${cover})`,
                                  backgroundSize: 'cover',
                              }
                            : undefined
                    }
                />
                <Flex direction="column" gap="1" className="min-w-0">
                    <Text as="p" size="5" weight="bold" className="truncate">
                        {title}
                    </Text>
                    <Text as="p" size="2" color="gray" className="truncate">
                        {artists}
                    </Text>
                    {link && (
                        <ExternalLink href={link} size="1">
                            Open in Spotify
                        </ExternalLink>
                    )}
                </Flex>
            </Flex>

            <Flex
                direction="column"
                gap="2"
                className="rounded-2xl bg-black/40 p-4 shadow-[0_25px_45px_rgba(0,0,0,0.55)]"
            >
                <Text size="2" color="gray">
                    Live lyrics
                </Text>
                <Flex
                    direction="column"
                    gap="1"
                    className="leading-relaxed font-medium"
                >
                    {FALLBACK_LYRICS.map((line, index) => (
                        <Text
                            key={line + index}
                            size="4"
                            weight={index === 0 ? 'bold' : 'regular'}
                            color={index === 0 ? undefined : 'gray'}
                        >
                            {line}
                        </Text>
                    ))}
                </Flex>
            </Flex>

            <Flex justify="between" align="center">
                <Text size="1" color="gray">
                    More lyric sources coming soon.
                </Text>
                <Button size="1" variant="soft" color="gray" disabled>
                    Sync Status: Offline
                </Button>
            </Flex>
        </Flex>
    );
}
