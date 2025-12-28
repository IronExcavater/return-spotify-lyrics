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
        <Flex
            flexGrow="1"
            direction="column"
            gap="4"
            className="min-h-0 overflow-y-auto"
        >
            <Flex p="3" direction="column" gap="2">
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
                    <MediaCard
                        imageShape="round"
                        title="Robot Rock"
                        subtitle="Daft Punk"
                        icon={<DiscIcon />}
                    />
                    <MediaCard
                        title="Loading card"
                        subtitle="Skeleton state"
                        loading
                        icon={<DiscIcon />}
                    />
                    <MediaCard
                        title="Very long title to test marquee scrolling and wrapping resilience"
                        subtitle="A long artist name to force marquee bounce and truncation checks"
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
                    <MediaListItem
                        title="Washing Machine Heart"
                        subtitle="Mitski"
                        icon={<PersonIcon />}
                        imageShape="round"
                        loading
                    />
                    <MediaListItem
                        title="Midnight City"
                        subtitle="M83"
                        icon={<PersonIcon />}
                        imageShape="round"
                    />
                    <MediaListItem
                        title="Skeleton row while we wait"
                        subtitle="Shows loading shimmer"
                        icon={<DiscIcon />}
                        loading
                    />
                </MediaList>
            </Flex>
        </Flex>
    );
}
