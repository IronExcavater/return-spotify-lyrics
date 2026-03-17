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

const LOCALE_OPTIONS = [
    { label: 'System', locale: 'system' },
    { label: 'United States', locale: 'en-US' },
    { label: 'United Kingdom', locale: 'en-GB' },
    { label: 'Australia', locale: 'en-AU' },
    { label: 'Canada', locale: 'en-CA' },
    { label: 'Ireland', locale: 'en-IE' },
    { label: 'New Zealand', locale: 'en-NZ' },
    { label: 'South Africa', locale: 'en-ZA' },
    { label: 'France', locale: 'fr-FR' },
    { label: 'Germany', locale: 'de-DE' },
    { label: 'Italy', locale: 'it-IT' },
    { label: 'Spain', locale: 'es-ES' },
    { label: 'Portugal', locale: 'pt-PT' },
    { label: 'Brazil', locale: 'pt-BR' },
    { label: 'Netherlands', locale: 'nl-NL' },
    { label: 'Sweden', locale: 'sv-SE' },
    { label: 'Norway', locale: 'nb-NO' },
    { label: 'Denmark', locale: 'da-DK' },
    { label: 'Finland', locale: 'fi-FI' },
    { label: 'Poland', locale: 'pl-PL' },
    { label: 'Czech Republic', locale: 'cs-CZ' },
    { label: 'Hungary', locale: 'hu-HU' },
    { label: 'Romania', locale: 'ro-RO' },
    { label: 'Greece', locale: 'el-GR' },
    { label: 'Turkey', locale: 'tr-TR' },
    { label: 'Russia', locale: 'ru-RU' },
    { label: 'Ukraine', locale: 'uk-UA' },
    { label: 'Israel', locale: 'he-IL' },
    { label: 'Saudi Arabia', locale: 'ar-SA' },
    { label: 'India', locale: 'hi-IN' },
    { label: 'Thailand', locale: 'th-TH' },
    { label: 'Vietnam', locale: 'vi-VN' },
    { label: 'Indonesia', locale: 'id-ID' },
    { label: 'Malaysia', locale: 'ms-MY' },
    { label: 'Japan', locale: 'ja-JP' },
    { label: 'South Korea', locale: 'ko-KR' },
    { label: 'China', locale: 'zh-CN' },
    { label: 'Taiwan', locale: 'zh-TW' },
] as const;

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

function formatAbsolute(
    timestamp: number | undefined,
    formatter: Intl.DateTimeFormat
) {
    return timestamp ? formatter.format(new Date(timestamp)) : undefined;
}

interface Props {
    profile: UserProfile | undefined;
    onLogout: () => void;
    connection?: SpotifyConnectionMeta;
}

export function ProfileView({ profile, onLogout, connection }: Props) {
    const cachedProfile = useMediaCacheEntry<ProfileCacheEntry>(
        MEDIA_CACHE_KEYS.profile
    );
    const loading = !profile && !cachedProfile;
    const [relativeNow, setRelativeNow] = useState(Date.now());
    const [localeSearch, setLocaleSearch] = useState('');
    const [localeOpen, setLocaleOpen] = useState(false);
    const { settings, updateSettings } = useSettings();
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

    const id = profile?.id ?? cachedProfile?.id;
    const name = profile?.display_name ?? cachedProfile?.name;
    const image = useCachedImage(
        profile?.images?.[0]?.url ?? cachedProfile?.imageUrl
    );
    const link = profile?.external_urls?.spotify ?? cachedProfile?.externalUrl;
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
                label: 'Signed in',
                value:
                    connectedRelative ??
                    formatAbsolute(
                        connection?.connectedAt,
                        absoluteFormatter
                    ) ??
                    '—',
                hint: connection?.connectedAt
                    ? formatAbsolute(connection.connectedAt, fullDateFormatter)
                    : undefined,
            },
            {
                label: 'Last update',
                value:
                    lastSyncRelative ??
                    formatAbsolute(
                        connection?.lastActiveAt,
                        absoluteFormatter
                    ) ??
                    '—',
                hint: connection?.lastActiveAt
                    ? formatAbsolute(connection.lastActiveAt, fullDateFormatter)
                    : undefined,
            },
        ];
    }, [
        absoluteFormatter,
        connection?.connectedAt,
        connection?.lastActiveAt,
        followers,
        fullDateFormatter,
        relativeNow,
    ]);

    const localeOptions = useMemo(() => {
        const query = localeSearch.trim().toLowerCase();
        if (!query) return LOCALE_OPTIONS;
        return LOCALE_OPTIONS.filter(
            (option) =>
                option.label.toLowerCase().includes(query) ||
                option.locale.toLowerCase().includes(query)
        );
    }, [localeSearch]);

    const activeLocale =
        LOCALE_OPTIONS.find((option) => option.locale === settings.locale) ??
        LOCALE_OPTIONS[0];

    return (
        <Flex direction="column" justify="center">
            <Flex p="3" direction="column" gap="2">
                {/* Avatar + display name */}
                <Flex align="center" justify="between" gap="3">
                    <Flex
                        gap="3"
                        align="center"
                        onClick={
                            link ? () => window.open(link, '_blank') : undefined
                        }
                        className={link ? 'group cursor-pointer' : 'group'}
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
                                parts={[name]}
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
                                    {name}
                                </TextButton>
                            </SkeletonText>
                            <SkeletonText
                                loading={loading}
                                parts={[id]}
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
                                    @{id}
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
                                checked={!!settings.reducedMotion}
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
                                        {activeLocale.label}
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
