import { useEffect, useMemo, useState } from 'react';
import { ExitIcon, PersonIcon } from '@radix-ui/react-icons';
import {
    AlertDialog,
    Avatar,
    Button,
    Flex,
    IconButton,
    Popover,
    Switch,
    Text,
    Tooltip,
} from '@radix-ui/themes';
import { UserProfile } from '@spotify/web-api-ts-sdk';

import { resolveLocale } from '../../shared/locale';
import {
    SearchList,
    SearchListItem,
    SearchListMessage,
} from '../components/SearchList';
import { SkeletonText } from '../components/SkeletonText';
import { TextButton } from '../components/TextButton';
import {
    DEFAULT_LOCALE_OPTION,
    filterLocaleOptions,
    findLocaleOption,
} from '../data/localeOptions';
import {
    MEDIA_CACHE_KEYS,
    type ProfileCacheEntry,
} from '../hooks/mediaCacheEntries';
import { SpotifyConnectionMeta } from '../hooks/useAuth';
import { useDropdownSurface } from '../hooks/useDropdownSurface';
import { useCachedImage, useMediaCacheEntry } from '../hooks/useMediaCache';
import { useSettings } from '../hooks/useSettings';

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
});

type ProfileStat = {
    label: string;
    value: string;
    hint?: string;
};

const formatRelative = (timestamp?: number, now?: number) => {
    if (!timestamp || !now) return undefined;

    const diff = timestamp - now;
    const ranges: [Intl.RelativeTimeFormatUnit, number][] = [
        ['day', 86400000],
        ['hour', 3600000],
        ['minute', 60000],
        ['second', 1000],
    ];

    for (const [unit, ms] of ranges) {
        if (Math.abs(diff) < ms && unit !== 'second') continue;
        return relativeFormatter.format(Math.round(diff / ms), unit);
    }

    return undefined;
};

const formatAbsolute = (
    timestamp: number | undefined,
    formatter: Intl.DateTimeFormat
) => (timestamp ? formatter.format(new Date(timestamp)) : undefined);

const buildStats = ({
    absoluteFormatter,
    connection,
    followers,
    fullDateFormatter,
    relativeNow,
}: {
    absoluteFormatter: Intl.DateTimeFormat;
    connection?: SpotifyConnectionMeta;
    followers?: number;
    fullDateFormatter: Intl.DateTimeFormat;
    relativeNow: number;
}): ProfileStat[] => {
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
            value: followers != null ? followers.toLocaleString() : '\u2014',
        },
        {
            label: 'Signed in',
            value:
                connectedRelative ??
                formatAbsolute(connection?.connectedAt, absoluteFormatter) ??
                '\u2014',
            hint: connection?.connectedAt
                ? formatAbsolute(connection.connectedAt, fullDateFormatter)
                : undefined,
        },
        {
            label: 'Last update',
            value:
                lastSyncRelative ??
                formatAbsolute(connection?.lastActiveAt, absoluteFormatter) ??
                '\u2014',
            hint: connection?.lastActiveAt
                ? formatAbsolute(connection.lastActiveAt, fullDateFormatter)
                : undefined,
        },
    ];
};

interface Props {
    profile: UserProfile | undefined;
    onLogout: () => void;
    connection?: SpotifyConnectionMeta;
}

export function ProfileView({ profile, onLogout, connection }: Props) {
    const cachedProfile = useMediaCacheEntry<ProfileCacheEntry>(
        MEDIA_CACHE_KEYS.profile
    );
    const { settings, updateSettings } = useSettings();

    const loading = !profile && !cachedProfile;
    const [relativeNow, setRelativeNow] = useState(Date.now());
    const [localeSearch, setLocaleSearch] = useState('');
    const [localeOpen, setLocaleOpen] = useState(false);

    const localeDropdown = useDropdownSurface({
        onRequestClose: () => setLocaleOpen(false),
        onClosed: () => setLocaleSearch(''),
    });

    const resolvedLocale = resolveLocale(settings.locale);
    const absoluteFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(resolvedLocale, {
                dateStyle: 'medium',
                timeStyle: 'short',
            }),
        [resolvedLocale]
    );
    const fullDateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(resolvedLocale, {
                dateStyle: 'full',
                timeStyle: 'short',
            }),
        [resolvedLocale]
    );

    useEffect(() => {
        const interval = window.setInterval(() => {
            setRelativeNow(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    const resolvedProfile = {
        id: profile?.id ?? cachedProfile?.id,
        name: profile?.display_name ?? cachedProfile?.name,
        imageUrl: profile?.images?.[0]?.url ?? cachedProfile?.imageUrl,
        link: profile?.external_urls?.spotify ?? cachedProfile?.externalUrl,
        followers: profile?.followers?.total,
    };

    const image = useCachedImage(resolvedProfile.imageUrl);
    const stats = useMemo(
        () =>
            buildStats({
                absoluteFormatter,
                connection,
                followers: resolvedProfile.followers,
                fullDateFormatter,
                relativeNow,
            }),
        [
            absoluteFormatter,
            connection,
            fullDateFormatter,
            relativeNow,
            resolvedProfile.followers,
        ]
    );
    const localeOptions = useMemo(
        () => filterLocaleOptions(localeSearch),
        [localeSearch]
    );
    const activeLocale = findLocaleOption(settings.locale);

    return (
        <Flex direction="column" justify="center">
            <Flex p="3" direction="column" gap="2">
                <Flex align="center" justify="between" gap="3">
                    <Flex
                        gap="3"
                        align="center"
                        onClick={
                            resolvedProfile.link
                                ? () =>
                                      window.open(
                                          resolvedProfile.link,
                                          '_blank'
                                      )
                                : undefined
                        }
                        className={
                            resolvedProfile.link
                                ? 'group cursor-pointer'
                                : 'group'
                        }
                    >
                        <Avatar
                            radius="full"
                            src={image}
                            fallback={<PersonIcon />}
                            size="4"
                        />
                        <Flex direction="column" gap="1" align="start">
                            <SkeletonText
                                loading={loading}
                                preset="media-row"
                                variant="title"
                                className="w-fit"
                            >
                                <TextButton
                                    size="4"
                                    weight="bold"
                                    interactive
                                    className="group-hover:text-accent-11"
                                >
                                    {resolvedProfile.name}
                                </TextButton>
                            </SkeletonText>
                            <SkeletonText
                                loading={loading}
                                preset="media-row"
                                variant="subtitle"
                                className="w-fit"
                            >
                                <TextButton
                                    size="2"
                                    color="gray"
                                    interactive
                                    className="group-hover:text-accent-11"
                                >
                                    @{resolvedProfile.id}
                                </TextButton>
                            </SkeletonText>
                        </Flex>
                    </Flex>
                    <AlertDialog.Root>
                        <AlertDialog.Trigger>
                            <IconButton
                                size="1"
                                variant="soft"
                                color="red"
                                aria-label="Disconnect Spotify"
                            >
                                <ExitIcon />
                            </IconButton>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content maxWidth="260px" size="1">
                            <AlertDialog.Title size="3">
                                Disconnect Spotify
                            </AlertDialog.Title>
                            <AlertDialog.Description size="2">
                                Signing out disables playback controls until you
                                log back in.
                            </AlertDialog.Description>
                            <Flex mt="3" justify="end" gap="2">
                                <AlertDialog.Cancel>
                                    <Button size="1" variant="soft">
                                        Cancel
                                    </Button>
                                </AlertDialog.Cancel>
                                <AlertDialog.Action>
                                    <Button
                                        variant="soft"
                                        color="red"
                                        onClick={onLogout}
                                        size="1"
                                        autoFocus
                                    >
                                        Disconnect
                                    </Button>
                                </AlertDialog.Action>
                            </Flex>
                        </AlertDialog.Content>
                    </AlertDialog.Root>
                </Flex>

                <Flex direction="column" className="divide-y divide-white/10">
                    {stats.map((stat) => (
                        <Flex
                            key={stat.label}
                            align="center"
                            justify="between"
                            px="3"
                            py="1"
                        >
                            <Text
                                size="1"
                                color="gray"
                                className="tracking-[0.3em] uppercase"
                            >
                                {stat.label}
                            </Text>
                            {stat.hint ? (
                                <Tooltip
                                    content={stat.hint}
                                    className="shadow-lg"
                                >
                                    <Text size="2" weight="bold">
                                        {stat.value}
                                    </Text>
                                </Tooltip>
                            ) : (
                                <Text size="2" weight="bold">
                                    {stat.value}
                                </Text>
                            )}
                        </Flex>
                    ))}
                </Flex>

                <Flex direction="column" gap="1" pt="2">
                    <Text size="3" weight="bold">
                        Settings
                    </Text>
                    <Flex
                        direction="column"
                        className="divide-y divide-white/10"
                    >
                        <Flex align="center" justify="between" px="3" py="2">
                            <Flex direction="column" gap="1">
                                <Text size="2">Reduced animation</Text>
                                <Text size="1" color="gray">
                                    Marquees animate on hover only.
                                </Text>
                            </Flex>
                            <Switch
                                size="1"
                                checked={Boolean(settings.reducedMotion)}
                                onCheckedChange={(checked) =>
                                    updateSettings({ reducedMotion: checked })
                                }
                            />
                        </Flex>
                        <Flex
                            align="center"
                            justify="between"
                            gap="3"
                            px="3"
                            py="2"
                        >
                            <Flex
                                direction="column"
                                gap="1"
                                className="min-w-0"
                            >
                                <Text size="2">Locale</Text>
                                <Text
                                    size="1"
                                    color="gray"
                                    className="truncate"
                                >
                                    Pick a region for date formatting.
                                </Text>
                            </Flex>
                            <Popover.Root
                                open={localeOpen}
                                onOpenChange={setLocaleOpen}
                            >
                                <Popover.Trigger>
                                    <Button
                                        size="1"
                                        variant="soft"
                                        className="max-w-30 truncate"
                                    >
                                        {activeLocale.label ??
                                            DEFAULT_LOCALE_OPTION.label}
                                    </Button>
                                </Popover.Trigger>
                                <Popover.Content
                                    align="end"
                                    sideOffset={6}
                                    className="search-list-surface"
                                    {...localeDropdown.contentProps}
                                >
                                    <SearchList
                                        items={localeOptions}
                                        query={localeSearch}
                                        onQueryChange={setLocaleSearch}
                                        onClearQuery={() => setLocaleSearch('')}
                                        placeholder="Search locales"
                                        searchAriaLabel="Search locales"
                                        clearSearchAriaLabel="Clear locale search"
                                        width="14rem"
                                        maxListHeight="13.75rem"
                                        emptyState={
                                            <SearchListMessage>
                                                No matches
                                            </SearchListMessage>
                                        }
                                        getKey={(option) => option.locale}
                                        renderItem={(option) => (
                                            <SearchListItem
                                                className="justify-between"
                                                onClick={() => {
                                                    updateSettings({
                                                        locale: option.locale,
                                                    });
                                                    setLocaleOpen(false);
                                                }}
                                            >
                                                <Text
                                                    size="1"
                                                    className="min-w-0 truncate"
                                                >
                                                    {option.label}
                                                </Text>
                                                <Text
                                                    size="1"
                                                    color="gray"
                                                    className="shrink-0 text-[11px]"
                                                >
                                                    {option.locale}
                                                </Text>
                                            </SearchListItem>
                                        )}
                                    />
                                </Popover.Content>
                            </Popover.Root>
                        </Flex>
                    </Flex>
                </Flex>
            </Flex>
        </Flex>
    );
}
