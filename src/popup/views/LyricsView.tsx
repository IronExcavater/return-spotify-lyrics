import { Flex, Text } from '@radix-ui/themes';
import { Marquee } from '../components/Marquee';
import { Fade } from '../components/Fade';

export function LyricsView() {
    return (
        <Flex p="4" direction="column" gap="2">
            <Text size="5" weight="bold">
                Lyrics
            </Text>
            <Text size="2" color="gray">
                Lyrics will be shown here.
            </Text>
        </Flex>
    );
}
