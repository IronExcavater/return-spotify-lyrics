import { useEffect, useMemo, useState } from 'react';
import {
    Cross2Icon,
    ExitIcon,
    MagnifyingGlassIcon,
    PersonIcon,
} from '@radix-ui/react-icons';
import {
    AlertDialog,
    Avatar,
    Button,
    Flex,
    IconButton,
    Popover,
    Skeleton,
    Switch,
    Text,
} from '@radix-ui/themes';
import { UserProfile } from '@spotify/web-api-ts-sdk';
import { SearchBar } from '../components/SearchBar';
import { SpotifyConnectionMeta } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
});

const absoluteFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
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
    const [localeSearch, setLocaleSearch] = useState('');
    const [localeOpen, setLocaleOpen] = useState(false);
    const { settings, updateSettings } = useSettings();

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
                label: 'Signed in',
                value:
                    connectedRelative ??
                    formatAbsolute(connection?.connectedAt) ??
                    '—',
                hint: connection?.connectedAt
                    ? formatAbsolute(connection.connectedAt)
                    : undefined,
            },
            {
                label: 'Last update',
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
        <Flex flexGrow="1" direction="column" justify="center">
            <Flex p="3" direction="column" gap="2">
                {/* Avatar + display name */}
                <Flex align="center" justify="between" gap="3">
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

                <Flex direction="column" gap="1" pt="2">
                    <Text size="3" weight="bold">
                        Settings
                    </Text>
                    <ul className="divide-y divide-white/10">
                        <li className="flex items-center justify-between px-3 py-2">
                            <Flex direction="column">
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
                        </li>
                        <li className="flex items-center justify-between gap-3 px-3 py-2">
                            <Flex direction="column" className="min-w-0">
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
                                onOpenChange={(open) => {
                                    setLocaleOpen(open);
                                    if (!open) setLocaleSearch('');
                                }}
                            >
                                <Popover.Trigger>
                                    <Button
                                        size="1"
                                        variant="soft"
                                        className="max-w-[120px] truncate"
                                    >
                                        {activeLocale.label}
                                    </Button>
                                </Popover.Trigger>
                                <Popover.Content
                                    align="end"
                                    sideOffset={6}
                                    className="w-[260px] p-0"
                                >
                                    <div className="px-1 py-1">
                                        <SearchBar
                                            value={localeSearch}
                                            onChange={(value) =>
                                                setLocaleSearch(value)
                                            }
                                            onClear={() => setLocaleSearch('')}
                                            placeholder="Search locales"
                                            size="1"
                                            radius="full"
                                            className="w-full min-w-0"
                                            leftSlot={
                                                <IconButton
                                                    size="1"
                                                    variant="ghost"
                                                    aria-label="Search locales"
                                                >
                                                    <MagnifyingGlassIcon />
                                                </IconButton>
                                            }
                                            rightSlot={
                                                <IconButton
                                                    size="1"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setLocaleSearch('')
                                                    }
                                                    aria-label="Clear locale search"
                                                >
                                                    <Cross2Icon />
                                                </IconButton>
                                            }
                                        />
                                    </div>
                                    <div className="max-h-[220px] overflow-y-auto">
                                        {localeOptions.length === 0 && (
                                            <div className="px-2 py-1 text-[12px] text-[var(--gray-11)]">
                                                No matches
                                            </div>
                                        )}
                                        {localeOptions.map((option) => (
                                            <button
                                                key={option.locale}
                                                type="button"
                                                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[12px] text-[var(--gray-12)] hover:bg-[var(--gray-a3)]"
                                                onClick={() => {
                                                    updateSettings({
                                                        locale: option.locale,
                                                    });
                                                    setLocaleOpen(false);
                                                }}
                                            >
                                                <span className="truncate">
                                                    {option.label}
                                                </span>
                                                <span className="shrink-0 text-[11px] text-[var(--gray-11)]">
                                                    {option.locale}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </Popover.Content>
                            </Popover.Root>
                        </li>
                    </ul>
                </Flex>
            </Flex>
        </Flex>
    );
}
