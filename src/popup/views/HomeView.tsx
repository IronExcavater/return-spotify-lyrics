import { Button, Card, Flex, Text } from '@radix-ui/themes';
import { Marquee } from '../components/Marquee';
import { Fade } from '../components/Fade';

interface Props {}

export function HomeView({}: Props) {
    return (
        <Flex m="3" flexGrow="1" justify="center" direction="column">
            Home
        </Flex>
    );
}
