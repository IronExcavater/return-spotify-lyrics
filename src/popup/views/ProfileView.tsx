import {
    Avatar,
    Button,
    Card,
    DataList,
    Flex,
    Skeleton,
    Text,
} from '@radix-ui/themes';
import { PersonIcon } from '@radix-ui/react-icons';
import { User } from '@spotify/web-api-ts-sdk';

interface Props {
    profile: User | undefined;
    onLogout: () => void;
}

export function ProfileView({ profile, onLogout }: Props) {
    const loading = !profile;

    const id = profile?.id ?? '0000000000000000000000000';
    const name = profile?.display_name ?? 'John Does Nuts';
    const image = profile?.images?.[0]?.url;
    const link = profile?.external_urls?.spotify;
    const followers = profile?.followers?.total;

    return (
        <Flex m="3" flexGrow="1" justify="center">
            <Card size="1">
                <Flex direction="column" gap="2">
                    {/* Avatar + display name */}
                    <Flex
                        gap="3"
                        align="center"
                        onClick={() => window.open(link, '_blank')}
                        style={{ cursor: 'pointer' }}
                    >
                        <Skeleton loading={loading}>
                            <Avatar
                                radius="full"
                                src={image}
                                fallback={<PersonIcon />}
                                size="4"
                            />
                        </Skeleton>
                        <Flex direction="column" gap="1" align="start">
                            <Skeleton loading={loading}>
                                <Text size="4" weight="bold">
                                    {name}
                                </Text>
                            </Skeleton>
                            <Skeleton loading={loading}>
                                <Text size="2" color="gray">
                                    @{id}
                                </Text>
                            </Skeleton>
                        </Flex>
                    </Flex>

                    <DataList.Root>
                        {/* Followers */}
                        <DataList.Item>
                            <DataList.Label>Followers</DataList.Label>
                            <DataList.Value>{followers}</DataList.Value>
                        </DataList.Item>
                    </DataList.Root>

                    {/* Disconnect */}
                    <Button color="red" variant="soft" onClick={onLogout}>
                        Disconnect Spotify
                    </Button>
                </Flex>
            </Card>
        </Flex>
    );
}
