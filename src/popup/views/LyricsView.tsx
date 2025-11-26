import { Flex, Text } from '@radix-ui/themes';
import { Scrollable } from '../components/Scrollable';
import { FadeMask } from '../components/FadeMask';

export function LyricsView() {
    return (
        <Flex p="4" direction="column" gap="2">
            <Text size="5" weight="bold">
                Lyrics
            </Text>
            <Text size="2" color="gray">
                Lyrics will be shown here.
            </Text>
            <FadeMask fade="horizontal" color="#121212" size={32}>
                <Scrollable>
                    <p>Hi</p>
                    <p>Again</p>
                    <p>Its Me</p>
                    <p>Markiplier</p>
                </Scrollable>
            </FadeMask>
        </Flex>
    );
}
