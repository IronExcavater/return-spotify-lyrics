import { Flex, Text } from '@radix-ui/themes';

const FALLBACK_LYRICS = [
    'Falling into midnight lines,',
    'Chasing echoes in neon skies,',
    'Heartbeat drums and whispered rhymes,',
    'Hold your breath, this moment shines.',
];

export function LyricsView() {
    const averageColor = false;

    return (
        <Flex
            direction="column"
            flexGrow="1"
            className="min-h-70 text-white select-none"
            p="4"
            style={{
                background: averageColor
                    ? `radial-gradient(circle at top, rgba(255,255,255,0.15), transparent 45%), ${averageColor}`
                    : 'var(--gray-12)',
            }}
        >
            <Flex
                direction="column"
                gap="1"
                className="text-lg leading-relaxed"
            >
                {FALLBACK_LYRICS.map((line, index) => (
                    <Text key={`${line}-${index}`} size="4" weight="medium">
                        {line}
                    </Text>
                ))}
            </Flex>
        </Flex>
    );
}
