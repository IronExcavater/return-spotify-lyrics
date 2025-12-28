import {
    DiscIcon,
    PersonIcon,
    DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import { Flex, IconButton, Text } from '@radix-ui/themes';
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
            m="3"
            flexGrow="1"
            direction="column"
            gap="4"
            className="min-h-0 overflow-y-auto"
        >
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
                        contextMenu={
                            <IconButton
                                size="1"
                                radius="full"
                                variant="soft"
                                aria-label="Nightcall options"
                            >
                                <DotsHorizontalIcon />
                            </IconButton>
                        }
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
                        contextMenu={
                            <IconButton
                                size="1"
                                radius="full"
                                variant="soft"
                                aria-label="Long title options"
                            >
                                <DotsHorizontalIcon />
                            </IconButton>
                        }
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
                        contextMenu={
                            <IconButton
                                size="1"
                                radius="full"
                                variant="ghost"
                                aria-label="Discovery options"
                            >
                                <DotsHorizontalIcon />
                            </IconButton>
                        }
                    />
                    <MediaListItem
                        title="Phoenix"
                        subtitle="French indie"
                        icon={<PersonIcon />}
                        imageShape="round"
                        contextMenu={
                            <IconButton
                                size="1"
                                radius="full"
                                variant="ghost"
                                aria-label="Phoenix options"
                            >
                                <DotsHorizontalIcon />
                            </IconButton>
                        }
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
