import { useEffect, useMemo, useState } from 'react';
import { PersonIcon } from '@radix-ui/react-icons';
import {
    AlertDialog,
    Avatar,
    Button,
    Flex,
    Skeleton,
    Text,
} from '@radix-ui/themes';
import { UserProfile } from '@spotify/web-api-ts-sdk';
import { SpotifyConnectionMeta } from '../hooks/useSpotifyAuth';

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
});

const absoluteFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function formatRelative(timestamp?: number, now?: number) {
    if (!timestamp || !now) return undefined;
    const diff = timestamp - now;
    const ranges: [Intl.RelativeTimeFormatUnit, number][] = [
        ['day', 86400000],
        ['hour', 3600000],
        ['minute', 60000],
        ['second', 1000],
    ];

    for (const [unit, ms] of ranges) {
        if (Math.abs(diff) >= ms || unit === 'second') {
            return relativeFormatter.format(Math.round(diff / ms), unit);
        }
    }

    return undefined;
}

function formatAbsolute(timestamp?: number) {
    return timestamp
        ? absoluteFormatter.format(new Date(timestamp))
        : undefined;
}

interface Props {
    profile: UserProfile | undefined;
    onLogout: () => void;
    connection?: SpotifyConnectionMeta;
}

export function ProfileView({ profile, onLogout, connection }: Props) {
    const loading = !profile;
    const [relativeNow, setRelativeNow] = useState(Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => {
            setRelativeNow(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    const id = profile?.id ?? '0000000000000000000000000';
    const name = profile?.display_name ?? 'John Does Nuts';
    const image = profile?.images?.[0]?.url;
    const link = profile?.external_urls?.spotify;
    const followers = profile?.followers?.total;

    const stats = useMemo(() => {
        const connectedRelative = formatRelative(
            connection?.connectedAt,
            relativeNow
        );
        const lastSyncRelative = formatRelative(
            connection?.lastActiveAt,
            relativeNow
        );

        return [
            {
                label: 'Followers',
                value: followers != null ? followers.toLocaleString() : '—',
            },
            {
                label: 'Connected',
                value:
                    connectedRelative ??
                    formatAbsolute(connection?.connectedAt) ??
                    '—',
                hint: connection?.connectedAt
                    ? formatAbsolute(connection.connectedAt)
                    : undefined,
            },
            {
                label: 'Auth Sync',
                value:
                    lastSyncRelative ??
                    formatAbsolute(connection?.lastActiveAt) ??
                    '—',
                hint: connection?.lastActiveAt
                    ? formatAbsolute(connection.lastActiveAt)
                    : undefined,
            },
        ];
    }, [
        connection?.connectedAt,
        connection?.lastActiveAt,
        followers,
        relativeNow,
    ]);

    return (
        <Flex m="3" flexGrow="1" justify="center">
            <Flex direction="column" gap="2" className="flex-shrink-0">
                {/* Avatar + display name */}
                <Flex
                    gap="3"
                    align="center"
                    onClick={() => window.open(link, '_blank')}
                    style={{ cursor: 'pointer' }}
                >
                    <Avatar
                        radius="full"
                        src={image}
                        fallback={<PersonIcon />}
                        size="4"
                    />
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

                <ul className="divide-y divide-white/10">
                    {stats.map((stat) => (
                        <li
                            key={stat.label}
                            className="flex items-center justify-between px-3 py-1"
                            title={stat.hint ?? undefined}
                        >
                            <Text
                                size="1"
                                className="tracking-[0.3em] text-white/50 uppercase"
                            >
                                {stat.label}
                            </Text>
                            <Text size="2" weight="bold" className="text-white">
                                {stat.value}
                            </Text>
                        </li>
                    ))}
                </ul>

                <AlertDialog.Root>
                    <AlertDialog.Trigger>
                        <Button color="red" variant="soft">
                            Disconnect Spotify
                        </Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content maxWidth="280px" size="1">
                        <AlertDialog.Title size="3">
                            Disconnect Spotify
                        </AlertDialog.Title>
                        <AlertDialog.Description size="2">
                            Signing out disables playback controls until you log
                            back in.
                        </AlertDialog.Description>
                        <Flex mt="3" justify="end" gap="2">
                            <AlertDialog.Cancel>
                                <Button variant="soft">Cancel</Button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action>
                                <Button
                                    variant="soft"
                                    color="red"
                                    onClick={onLogout}
                                    autoFocus
                                >
                                    Disconnect
                                </Button>
                            </AlertDialog.Action>
                        </Flex>
                    </AlertDialog.Content>
                </AlertDialog.Root>
            </Flex>
        </Flex>
    );
}
