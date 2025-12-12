import { Flex, Text } from '@radix-ui/themes';

interface Props {
    searchQuery: string;
}

export function HomeView({ searchQuery }: Props) {
    const trimmed = searchQuery.trim();
    const hasQuery = trimmed.length > 0;

    return (
        <Flex m="3" flexGrow="1" justify="center" direction="column">
            {hasQuery ? (
                <Text size="4" weight="bold">
                    Showing results for “{trimmed}”
                </Text>
            ) : (
                <Text size="3" color="gray">
                    Start typing to search for lyrics tweaks, controls, or
                    artists.
                </Text>
            )}
        </Flex>
    );
}
