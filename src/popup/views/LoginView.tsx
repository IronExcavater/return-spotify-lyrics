import { Button, Card, Flex, Text } from '@radix-ui/themes';
import { Marquee } from '../components/Marquee';
import { Fade } from '../components/Fade';

interface Props {
    onLogin: () => void;
}

export function LoginView({ onLogin }: Props) {
    return (
        <Flex m="3" flexGrow="1" justify="center" direction="column">
            <Card size="1">
                <Flex direction="column" gap="2">
                    <Text size="5" weight="bold">
                        Connect to Spotify
                    </Text>
                    <Text size="2">
                        Enjoy Spotify lyrics unbound by a free account
                    </Text>
                    <Button size="2" onClick={onLogin}>
                        Login with Spotify
                    </Button>
                </Flex>
            </Card>
        </Flex>
    );
}
