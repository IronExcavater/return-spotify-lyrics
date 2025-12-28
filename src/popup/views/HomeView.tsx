import { DiscIcon, PersonIcon } from '@radix-ui/react-icons';
import { Flex, Text } from '@radix-ui/themes';
import { MediaCard } from '../components/MediaCard';
import { MediaList } from '../components/MediaList';
import { MediaListItem } from '../components/MediaListItem';

interface Props {
    searchQuery: string;
}

export function HomeView({ searchQuery }: Props) {
    const trimmed = searchQuery.trim();
    const hasQuery = trimmed.length > 0;

    return (
        <Flex m="3" flexGrow="1" direction="column" gap="4">
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

            <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                    Media cards
                </Text>
                <MediaList variant="card">
                    <MediaCard
                        title="Nightcall"
                        subtitle="Kavinsky"
                        icon={<DiscIcon />}
                    />
                    <MediaCard
                        title="On Hold"
                        subtitle="The xx"
                        icon={<DiscIcon />}
                    />
                </MediaList>
                <Text size="2" weight="bold">
                    Media list items
                </Text>
                <MediaList variant="list">
                    <MediaListItem
                        title="Discovery"
                        subtitle="Daft Punk"
                        icon={<DiscIcon />}
                    />
                    <MediaListItem
                        title="Phoenix"
                        subtitle="French indie"
                        icon={<PersonIcon />}
                        imageShape="round"
                    />
                </MediaList>
            </Flex>
        </Flex>
    );
}
