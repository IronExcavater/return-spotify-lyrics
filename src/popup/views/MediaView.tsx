import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DotsHorizontalIcon, PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import {
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
    Text,
} from '@radix-ui/themes';
import type {
    Album,
    Artist,
    Episode,
    Market,
    MaxInt,
    Playlist,
    Show,
    SimplifiedAlbum,
    SimplifiedEpisode,
    SimplifiedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';
import { MdMusicNote } from 'react-icons/md';
import { useLocation } from 'react-router-dom';

import {
    formatDurationLong,
    formatDurationShort,
    formatIsoDate,
} from '../../shared/date';
import { resolveLocale, resolveMarket } from '../../shared/locale';
import {
    albumTrackToItem,
    albumToItem,
    artistToItem,
    episodeToItem,
    formatAlbumType,
    playlistToItem,
    showEpisodeToItem,
    showToItem,
    trackToItem,
} from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaItem } from '../../shared/types';
import { AvatarButton } from '../components/AvatarButton';
import {
    DiscographyShelf,
    type DiscographyEntry,
} from '../components/DiscographyShelf';
import { Marquee } from '../components/Marquee';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { MediaShelf } from '../components/MediaShelf';
import { buildMediaActions } from '../helpers/mediaActions';
import {
    getLastMediaRouteState,
    loadLastMediaRouteState,
    setLastMediaRouteState,
    type MediaRouteState,
} from '../helpers/mediaRoute';
import { createMenuShortcutHandler } from '../helpers/menuShortcuts';
import { useHistory } from '../hooks/useHistory';
import { usePlayer } from '../hooks/usePlayer';
import { useSettings } from '../hooks/useSettings';

type MediaViewState =
    | {
          kind: 'album';
          album: Album;
          tracks: MediaItem[];
          trackLookup: Record<string, SimplifiedTrack>;
          totalDurationMs: number;
          selectedId?: string;
          selectedTrack?: SimplifiedTrack | null;
          artistTopTracks: MediaItem[];
      }
    | {
          kind: 'show';
          show: Show;
          episodes: MediaItem[];
          episodeLookup: Record<string, SimplifiedEpisode>;
          totalDurationMs: number;
          selectedId?: string;
          selectedEpisode?: SimplifiedEpisode | null;
      }
    | {
          kind: 'artist';
          artist: Artist;
          topTracks: MediaItem[];
          discography: DiscographyEntry[];
          fansAlsoLike: MediaItem[];
      }
    | {
          kind: 'playlist';
          playlist: Playlist<Track>;
          items: MediaItem[];
          totalDurationMs: number;
      };

type HeroData = {
    title: string;
    subtitle?: ReactNode;
    info?: string;
    imageUrl?: string;
    heroUrl?: string;
    duration?: string;
    item: MediaItem;
};

const safeRequest = async <T,>(fn: () => Promise<T>, fallback: T) => {
    try {
        return await fn();
    } catch (error) {
        console.warn('[media] optional request failed', error);
        return fallback;
    }
};

const buildDiscographyEntries = async (
    albums: Array<SimplifiedAlbum | Album>,
    market: Market,
    trackCount: number
): Promise<DiscographyEntry[]> => {
    const limit = Math.min(trackCount, 10) as MaxInt<50>;
    const entries = await Promise.all(
        albums.map(async (album) => {
            if (!album.id) return null;
            const tracksPage = await safeRequest(
                () =>
                    sendSpotifyMessage('getAlbumTracks', {
                        id: album.id,
                        market,
                        limit,
                    }),
                null
            );
            if (!tracksPage) return null;
            const albumWithGroup =
                'album_group' in album
                    ? album
                    : { ...album, album_group: album.album_type };
            return {
                album: albumWithGroup as SimplifiedAlbum,
                tracks: tracksPage.items,
            };
        })
    );

    return entries.filter(Boolean) as DiscographyEntry[];
};

export function MediaView() {
    const location = useLocation();
    const { settings } = useSettings();
    const routeHistory = useHistory();
    const { playback, isPlaying, controls } = usePlayer();
    const market = resolveMarket(settings.locale);
    const locale = resolveLocale(settings.locale);

    const locationState = location.state as MediaRouteState | null;
    const [restoredState, setRestoredState] = useState<MediaRouteState | null>(
        null
    );
    const [restoring, setRestoring] = useState(locationState == null);
    const restoreGuard = useRef(false);
    const state = locationState ?? restoredState ?? getLastMediaRouteState();

    const [data, setData] = useState<MediaViewState | null>(null);
    const [loading, setLoading] = useState(true);
    const [discographySort, setDiscographySort] = useState<'newest' | 'oldest'>(
        'newest'
    );
    const discographyTrackCount = 5;
    const skeletonRows = useMemo(
        () =>
            Array.from({ length: 6 }, (_, index) => ({
                id: `skeleton-${index}`,
                title: 'Loading',
                subtitle: 'Loading',
            })),
        []
    );

    useEffect(() => {
        if (locationState) {
            setRestoring(false);
            return;
        }
        let cancelled = false;
        void loadLastMediaRouteState().then((stored) => {
            if (cancelled) return;
            if (stored) setRestoredState(stored);
            setRestoring(false);
        });
        return () => {
            cancelled = true;
        };
    }, [locationState]);

    useEffect(() => {
        if (locationState) {
            setLastMediaRouteState(locationState);
            restoreGuard.current = false;
            return;
        }
        if (state && !restoreGuard.current) {
            restoreGuard.current = true;
            routeHistory.goTo('/media', state);
        }
    }, [locationState, routeHistory, state]);

    useEffect(() => {
        if (!state?.id || !state?.kind) return;
        if (state.kind !== 'track' && state.kind !== 'episode') return;

        let cancelled = false;
        const resolve = async () => {
            try {
                if (state.kind === 'track') {
                    const track = await sendSpotifyMessage('getTrack', {
                        id: state.id,
                    });
                    if (cancelled) return;
                    if (track.album?.id) {
                        routeHistory.goTo('/media', {
                            kind: 'album',
                            id: track.album.id,
                            selectedId: track.id,
                        });
                    }
                } else {
                    const episode = await sendSpotifyMessage('getEpisode', {
                        id: state.id,
                        market,
                    });
                    if (cancelled) return;
                    if (episode.show?.id) {
                        routeHistory.goTo('/media', {
                            kind: 'show',
                            id: episode.show.id,
                            selectedId: episode.id,
                        });
                    }
                }
            } catch (error) {
                console.warn('[media] Failed to resolve context', error);
            }
        };

        void resolve();
        return () => {
            cancelled = true;
        };
    }, [market, routeHistory, state?.id, state?.kind]);

    useEffect(() => {
        if (!state?.id || !state?.kind) {
            setData(null);
            setLoading(false);
            return;
        }
        if (state.kind === 'track' || state.kind === 'episode') {
            setData(null);
            setLoading(true);
            return;
        }

        let cancelled = false;
        const load = async () => {
            setData(null);
            setLoading(true);
            try {
                switch (state.kind) {
                    case 'album': {
                        const album = await sendSpotifyMessage('getAlbum', {
                            id: state.id,
                            market,
                        });
                        const tracksPage = await sendSpotifyMessage(
                            'getAlbumTracks',
                            {
                                id: state.id,
                                market,
                                limit: 50,
                            }
                        );
                        const mainArtistId = album.artists?.[0]?.id;
                        const [, topTracks] =
                            mainArtistId != null
                                ? await Promise.all([
                                      safeRequest(
                                          () =>
                                              sendSpotifyMessage(
                                                  'getArtistAlbums',
                                                  {
                                                      id: mainArtistId,
                                                      market,
                                                      limit: 20,
                                                  }
                                              ),
                                          null
                                      ),
                                      safeRequest(
                                          () =>
                                              sendSpotifyMessage(
                                                  'getArtistTopTracks',
                                                  {
                                                      id: mainArtistId,
                                                      market,
                                                  }
                                              ),
                                          { tracks: [] }
                                      ),
                                  ])
                                : [null, { tracks: [] }];
                        const totalDurationMs = tracksPage.items.reduce(
                            (acc, track) => acc + (track.duration_ms ?? 0),
                            0
                        );
                        const tracks = tracksPage.items.map((track) =>
                            albumTrackToItem(track, album)
                        );
                        const artistTopTracks =
                            topTracks.tracks.map(trackToItem);
                        const trackLookup = tracksPage.items.reduce(
                            (acc, track) => {
                                if (track.id) acc[track.id] = track;
                                return acc;
                            },
                            {} as Record<string, SimplifiedTrack>
                        );
                        const selectedTrack =
                            state.selectedId != null
                                ? (tracksPage.items.find(
                                      (track) => track.id === state.selectedId
                                  ) ?? null)
                                : null;
                        if (!cancelled) {
                            setData({
                                kind: 'album',
                                album,
                                tracks,
                                trackLookup,
                                totalDurationMs,
                                selectedId: state.selectedId,
                                selectedTrack,
                                artistTopTracks,
                            });
                        }
                        break;
                    }
                    case 'show': {
                        const show = await sendSpotifyMessage('getShow', {
                            id: state.id,
                            market,
                        });
                        const episodesPage = await sendSpotifyMessage(
                            'getShowEpisodes',
                            {
                                id: state.id,
                                market,
                                limit: 50,
                            }
                        );
                        const totalDurationMs = episodesPage.items.reduce(
                            (acc, episode) => acc + (episode.duration_ms ?? 0),
                            0
                        );
                        const episodes = episodesPage.items.map((episode) =>
                            showEpisodeToItem(episode, show, settings.locale)
                        );
                        const episodeLookup = episodesPage.items.reduce(
                            (acc, episode) => {
                                if (episode.id) acc[episode.id] = episode;
                                return acc;
                            },
                            {} as Record<string, SimplifiedEpisode>
                        );
                        const selectedEpisode =
                            state.selectedId != null
                                ? (episodesPage.items.find(
                                      (episode) =>
                                          episode.id === state.selectedId
                                  ) ?? null)
                                : null;
                        if (!cancelled) {
                            setData({
                                kind: 'show',
                                show,
                                episodes,
                                episodeLookup,
                                totalDurationMs,
                                selectedId: state.selectedId,
                                selectedEpisode,
                            });
                        }
                        break;
                    }
                    case 'artist': {
                        const artist = await sendSpotifyMessage('getArtist', {
                            id: state.id,
                        });
                        const [topTracks, relatedArtists] = await Promise.all([
                            sendSpotifyMessage('getArtistTopTracks', {
                                id: state.id,
                                market,
                            }),
                            safeRequest(
                                () =>
                                    sendSpotifyMessage(
                                        'getArtistRelatedArtists',
                                        { id: state.id }
                                    ),
                                { artists: [] }
                            ),
                        ]);
                        const albumsPage = await safeRequest(
                            () =>
                                sendSpotifyMessage('getArtistAlbums', {
                                    id: state.id,
                                    market,
                                    limit: 20,
                                }),
                            null
                        );
                        const discographySeed =
                            albumsPage?.items?.filter((item) => item.id) ?? [];
                        const discographyAlbums = Array.from(
                            new Map(
                                discographySeed.map((item) => [item.id!, item])
                            ).values()
                        ).slice(0, 10);
                        const discography = await buildDiscographyEntries(
                            discographyAlbums,
                            market,
                            discographyTrackCount
                        );
                        const fansAlsoLike = relatedArtists.artists
                            .filter(
                                (artist) =>
                                    artist.id &&
                                    artist.id !== state.id &&
                                    artist.images?.length
                            )
                            .slice(0, 12)
                            .map(artistToItem);
                        if (!cancelled) {
                            setData({
                                kind: 'artist',
                                artist,
                                topTracks: topTracks.tracks.map(trackToItem),
                                discography,
                                fansAlsoLike,
                            });
                        }
                        break;
                    }
                    case 'playlist': {
                        const playlist = await sendSpotifyMessage(
                            'getPlaylist',
                            {
                                id: state.id,
                                market,
                            }
                        );
                        const itemsPage = await sendSpotifyMessage(
                            'getPlaylistItems',
                            {
                                id: state.id,
                                market,
                                limit: 50,
                            }
                        );
                        const playlistTracks = itemsPage.items
                            .map((entry) => entry.track)
                            .filter(Boolean) as Array<Track | Episode>;
                        const totalDurationMs = playlistTracks.reduce(
                            (acc, track) => acc + (track.duration_ms ?? 0),
                            0
                        );
                        const items = playlistTracks.map((track) =>
                            track.type === 'episode'
                                ? episodeToItem(
                                      track as Episode,
                                      settings.locale
                                  )
                                : trackToItem(track as Track)
                        );
                        if (!cancelled) {
                            setData({
                                kind: 'playlist',
                                playlist,
                                items,
                                totalDurationMs,
                            });
                        }
                        break;
                    }
                    default: {
                        setData(null);
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [market, settings.locale, state?.id, state?.kind]);

    useEffect(() => {
        setData((prev) => {
            if (!prev) return prev;
            if (prev.kind === 'album') {
                const selectedTrack = state?.selectedId
                    ? (prev.trackLookup[state.selectedId] ?? null)
                    : null;
                return {
                    ...prev,
                    selectedId: state?.selectedId,
                    selectedTrack,
                };
            }
            if (prev.kind === 'show') {
                const selectedEpisode = state?.selectedId
                    ? (prev.episodeLookup[state.selectedId] ?? null)
                    : null;
                return {
                    ...prev,
                    selectedId: state?.selectedId,
                    selectedEpisode,
                };
            }
            return prev;
        });
    }, [state?.selectedId]);

    const hero = useMemo<HeroData | null>(() => {
        if (!data) return null;
        if (data.kind === 'album') {
            const albumType = formatAlbumType(data.album);
            if (data.selectedTrack) {
                const artistNodes = data.selectedTrack.artists.map(
                    (artist, index) => (
                        <span key={artist.id ?? artist.name}>
                            {artist.id ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        routeHistory.goTo('/media', {
                                            kind: 'artist',
                                            id: artist.id!,
                                        })
                                    }
                                    className="text-left text-[12px] text-white/80 hover:text-white"
                                >
                                    {artist.name}
                                </button>
                            ) : (
                                <span className="text-[12px] text-white/80">
                                    {artist.name}
                                </span>
                            )}
                            {index < data.selectedTrack.artists.length - 1 && (
                                <span className="text-[11px] text-white/50">
                                    ,{' '}
                                </span>
                            )}
                        </span>
                    )
                );
                const year = formatIsoDate(
                    data.album.release_date,
                    { year: 'numeric' },
                    settings.locale
                );
                const info = [albumType, data.album.name, year]
                    .filter(Boolean)
                    .join(' • ');
                return {
                    title: data.selectedTrack.name,
                    subtitle: (
                        <div className="min-w-0 truncate">{artistNodes}</div>
                    ),
                    info,
                    imageUrl: data.album.images?.[0]?.url,
                    heroUrl: data.album.images?.[0]?.url,
                    duration: formatDurationShort(
                        data.selectedTrack.duration_ms
                    ),
                    item: albumTrackToItem(data.selectedTrack, data.album),
                };
            }
            const year = formatIsoDate(
                data.album.release_date,
                { year: 'numeric' },
                settings.locale
            );
            const info = [albumType, year, `${data.album.total_tracks} tracks`]
                .filter(Boolean)
                .join(' • ');
            return {
                title: data.album.name,
                subtitle: (
                    <div className="min-w-0 truncate">
                        {data.album.artists.map((artist, index) => (
                            <span key={artist.id ?? artist.name}>
                                {artist.id ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            routeHistory.goTo('/media', {
                                                kind: 'artist',
                                                id: artist.id!,
                                            })
                                        }
                                        className="text-left text-[12px] text-white/80 hover:text-white"
                                    >
                                        {artist.name}
                                    </button>
                                ) : (
                                    <span className="text-[12px] text-white/80">
                                        {artist.name}
                                    </span>
                                )}
                                {index < data.album.artists.length - 1 && (
                                    <span className="text-[11px] text-white/50">
                                        ,{' '}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                ),
                info,
                imageUrl: data.album.images?.[0]?.url,
                heroUrl: data.album.images?.[0]?.url,
                duration: formatDurationLong(data.totalDurationMs),
                item: albumToItem(data.album),
            };
        }
        if (data.kind === 'show') {
            if (data.selectedEpisode) {
                const info = [data.show.name].filter(Boolean).join(' • ');
                return {
                    title: data.selectedEpisode.name,
                    subtitle: data.show.publisher,
                    info,
                    imageUrl: data.show.images?.[0]?.url,
                    heroUrl: data.show.images?.[0]?.url,
                    duration: formatDurationShort(
                        data.selectedEpisode.duration_ms
                    ),
                    item: showEpisodeToItem(
                        data.selectedEpisode,
                        data.show,
                        settings.locale
                    ),
                };
            }
            return {
                title: data.show.name,
                subtitle: data.show.publisher,
                info: `${data.show.total_episodes} episodes`,
                imageUrl: data.show.images?.[0]?.url,
                heroUrl: data.show.images?.[0]?.url,
                duration: formatDurationLong(data.totalDurationMs),
                item: showToItem(data.show),
            };
        }
        if (data.kind === 'artist') {
            const followerTotal = data.artist.followers?.total;
            return {
                title: data.artist.name,
                subtitle:
                    followerTotal != null
                        ? `${followerTotal.toLocaleString(locale)} followers`
                        : undefined,
                info: data.artist.genres?.slice(0, 3).join(' • '),
                imageUrl: data.artist.images?.[0]?.url,
                heroUrl: data.artist.images?.[0]?.url,
                item: artistToItem(data.artist),
            };
        }
        if (data.kind === 'playlist') {
            return {
                title: data.playlist.name,
                subtitle: data.playlist.owner?.display_name,
                info: `${data.playlist.tracks.total} tracks`,
                imageUrl: data.playlist.images?.[0]?.url,
                heroUrl: data.playlist.images?.[0]?.url,
                duration: formatDurationLong(data.totalDurationMs),
                item: playlistToItem(data.playlist),
            };
        }
        return null;
    }, [data, locale, routeHistory, settings.locale]);

    if (!state) {
        if (restoring) {
            return (
                <Flex p="3" direction="column" gap="2">
                    <Skeleton>
                        <Text size="5" weight="bold">
                            Loading Title longer
                        </Text>
                    </Skeleton>
                    <Skeleton>
                        <Text size="2" color="gray">
                            Loading
                        </Text>
                    </Skeleton>
                </Flex>
            );
        }
        return (
            <Flex p="3" direction="column">
                <Text size="2" color="gray">
                    Select a media item to view details.
                </Text>
            </Flex>
        );
    }

    if (!loading && !data) {
        return (
            <Flex p="3" direction="column">
                <Text size="2" color="gray">
                    This media type is not supported yet.
                </Text>
            </Flex>
        );
    }

    const heroTitle = hero?.title ?? 'Loading';
    const heroSubtitle = hero?.subtitle ?? 'Loading';
    const heroInfo = hero?.info ?? 'Loading';

    const heroBackgroundStyle = hero?.heroUrl
        ? {
              backgroundImage: `linear-gradient(120deg, rgba(5,7,14,0.85) 0%, rgba(9,12,22,0.55) 60%, rgba(9,12,22,0.25) 100%), url(${hero.heroUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              WebkitMaskImage:
                  'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 92%, rgba(0,0,0,0.9) 94%, rgba(0,0,0,0) 100%)',
          }
        : {
              backgroundImage:
                  'linear-gradient(120deg, rgba(5,7,14,0.85) 0%, rgba(9,12,22,0.55) 60%, rgba(9,12,22,0.25) 100%)',
              WebkitMaskImage:
                  'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 92%, rgba(0,0,0,0.9) 94%, rgba(0,0,0,0) 100%)',
          };

    const artistUris =
        data?.kind === 'artist'
            ? data.topTracks
                  .map((track) => track.uri)
                  .filter((uri): uri is string => Boolean(uri))
            : [];
    const heroActions = hero ? buildMediaActions(hero.item) : null;
    const artistPlayAction =
        data?.kind === 'artist' && artistUris.length > 0
            ? {
                  id: 'play-popular',
                  label: 'Play popular',
                  shortcut: '↵',
                  onSelect: () => {
                      void sendSpotifyMessage('startPlayback', {
                          uris: artistUris,
                      });
                  },
              }
            : null;
    const mergedHeroActions = heroActions
        ? {
              primary: artistPlayAction
                  ? [artistPlayAction, ...heroActions.primary]
                  : heroActions.primary,
              secondary: heroActions.secondary,
          }
        : null;
    const hasHeroActions =
        mergedHeroActions &&
        (mergedHeroActions.primary.length > 0 ||
            mergedHeroActions.secondary.length > 0);
    const heroImageRadius = hero?.item.kind === 'artist' ? 'full' : 'small';
    const canTogglePlayback =
        data?.kind === 'artist'
            ? artistUris.length > 0 || playback !== undefined
            : playback !== undefined;

    const viewKey = `${state?.kind ?? 'none'}:${state?.id ?? 'none'}`;

    const popularAlbumTracks =
        data?.kind === 'album'
            ? (data?.artistTopTracks ?? [])
                  .filter(
                      (track) =>
                          track.id !== data?.selectedTrack?.id &&
                          !data?.trackLookup?.[track.id ?? '']
                  )
                  .slice(0, 12)
            : [];

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const heroStickyRef = useRef<HTMLDivElement | null>(null);
    const lastScrollTopRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        lastScrollTopRef.current = 0;
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        heroStickyRef.current?.style.setProperty('--hero-collapse', '0');
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [viewKey]);

    const handleScroll = () => {
        const node = scrollRef.current;
        if (!node) return;
        lastScrollTopRef.current = node.scrollTop;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const progress = Math.min(1, lastScrollTopRef.current / 24);
            heroStickyRef.current?.style.setProperty(
                '--hero-collapse',
                progress.toFixed(3)
            );
        });
    };

    return (
        <Flex
            key={viewKey}
            direction="column"
            className="min-h-0 overflow-y-auto"
            ref={scrollRef}
            onScroll={handleScroll}
        >
            <Flex
                className="sticky top-0 z-10 w-full"
                style={heroBackgroundStyle}
                ref={heroStickyRef}
            >
                <Flex
                    align="center"
                    gap="3"
                    className="relative w-full px-3 pb-3"
                    style={{
                        paddingTop: 'calc(12px - 8px * var(--hero-collapse))',
                    }}
                >
                    <Skeleton loading={loading}>
                        <AvatarButton
                            avatar={{
                                src: hero?.imageUrl,
                                fallback: <MdMusicNote />,
                                radius: heroImageRadius,
                                size: '6',
                            }}
                            aria-label={heroTitle}
                            hideRing
                            className="group"
                            disabled={!canTogglePlayback}
                            onClick={() => {
                                if (!canTogglePlayback) return;
                                if (
                                    data?.kind === 'artist' &&
                                    artistUris.length > 0
                                ) {
                                    if (isPlaying) void controls.pause();
                                    else
                                        void sendSpotifyMessage(
                                            'startPlayback',
                                            {
                                                uris: artistUris,
                                            }
                                        );
                                    return;
                                }
                                if (isPlaying) void controls.pause();
                                else void controls.play();
                            }}
                        >
                            {hero?.imageUrl && (
                                <Flex
                                    align="center"
                                    justify="center"
                                    className="absolute inset-0"
                                >
                                    <Flex className="rounded-full bg-[var(--color-panel-solid)]/10 p-1 text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                                        {isPlaying ? (
                                            <PauseIcon />
                                        ) : (
                                            <PlayIcon />
                                        )}
                                    </Flex>
                                </Flex>
                            )}
                        </AvatarButton>
                    </Skeleton>

                    <Flex
                        direction="column"
                        gap="1"
                        flexGrow="1"
                        className="min-w-0 flex-1"
                    >
                        <Skeleton loading={loading}>
                            <Marquee mode="bounce" className="min-w-0">
                                <Text size="5" weight="bold">
                                    {heroTitle}
                                </Text>
                            </Marquee>
                        </Skeleton>
                        {(hero?.subtitle || loading) && (
                            <Skeleton loading={loading}>
                                <Flex className="min-w-0">
                                    <Marquee mode="left" className="min-w-0">
                                        <Text size="1" color="gray">
                                            {heroSubtitle}
                                        </Text>
                                    </Marquee>
                                </Flex>
                            </Skeleton>
                        )}
                        {(hero?.info || loading) && (
                            <Skeleton loading={loading}>
                                <Marquee mode="left" className="min-w-0">
                                    <Text size="1" color="gray">
                                        {heroInfo}
                                    </Text>
                                </Marquee>
                            </Skeleton>
                        )}
                    </Flex>

                    <Flex direction="column" align="end" gap="2">
                        {hasHeroActions && (
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger disabled={loading}>
                                    <IconButton
                                        variant="ghost"
                                        radius="full"
                                        size="1"
                                        color="gray"
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                    >
                                        <DotsHorizontalIcon />
                                    </IconButton>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content
                                    align="end"
                                    size="1"
                                    onKeyDown={createMenuShortcutHandler(
                                        mergedHeroActions
                                            ? [
                                                  ...mergedHeroActions.primary,
                                                  ...mergedHeroActions.secondary,
                                              ]
                                            : []
                                    )}
                                >
                                    {mergedHeroActions?.primary.map(
                                        (action) => (
                                            <DropdownMenu.Item
                                                key={action.id}
                                                shortcut={action.shortcut}
                                                onSelect={() =>
                                                    action.onSelect()
                                                }
                                            >
                                                {action.label}
                                            </DropdownMenu.Item>
                                        )
                                    )}
                                    {mergedHeroActions &&
                                        mergedHeroActions.primary.length > 0 &&
                                        mergedHeroActions.secondary.length >
                                            0 && <DropdownMenu.Separator />}
                                    {mergedHeroActions?.secondary.map(
                                        (action) => (
                                            <DropdownMenu.Item
                                                key={action.id}
                                                shortcut={action.shortcut}
                                                onSelect={() =>
                                                    action.onSelect()
                                                }
                                            >
                                                {action.label}
                                            </DropdownMenu.Item>
                                        )
                                    )}
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        )}
                        {(hero?.duration || loading) && (
                            <Skeleton loading={loading}>
                                <Text size="1" color="gray">
                                    {hero?.duration ?? '0m'}
                                </Text>
                            </Skeleton>
                        )}
                    </Flex>
                </Flex>
            </Flex>

            <Flex direction="column" gap="0" className="px-3 pb-3">
                {data?.kind === 'album' && (
                    <>
                        {(data?.tracks?.length ?? 0) > 1 && (
                            <MediaSection
                                editing={false}
                                preview={loading}
                                section={
                                    {
                                        id: 'album-tracks',
                                        title: 'Album',
                                        view: 'list',
                                        items: data?.tracks ?? skeletonRows,
                                    } satisfies MediaSectionState
                                }
                                onChange={() => undefined}
                            />
                        )}
                        {popularAlbumTracks.length > 0 && (
                            <MediaSection
                                editing={false}
                                preview={loading}
                                section={
                                    {
                                        id: 'album-recommended',
                                        title: 'Popular',
                                        view: 'list',
                                        items: popularAlbumTracks,
                                    } satisfies MediaSectionState
                                }
                                onChange={() => undefined}
                            />
                        )}
                    </>
                )}

                {data?.kind === 'show' && (
                    <>
                        <Text size="3" weight="bold">
                            Show
                        </Text>
                        <MediaShelf
                            items={data?.episodes ?? skeletonRows}
                            variant="list"
                            orientation="vertical"
                            itemsPerColumn={6}
                            draggable={false}
                            interactive={!loading}
                            itemLoading={loading}
                        />
                    </>
                )}

                {data?.kind === 'artist' && (
                    <>
                        {(data?.topTracks?.length ?? 0) > 0 && (
                            <MediaSection
                                editing={false}
                                preview={loading}
                                section={
                                    {
                                        id: 'artist-recommended',
                                        title: 'Popular',
                                        view: 'list',
                                        items: data?.topTracks ?? skeletonRows,
                                    } satisfies MediaSectionState
                                }
                                onChange={() => undefined}
                            />
                        )}
                        {(data?.fansAlsoLike?.length ?? 0) > 0 && (
                            <MediaSection
                                editing={false}
                                preview={loading}
                                section={
                                    {
                                        id: 'artist-fans-also-like',
                                        title: 'Fans also like',
                                        view: 'card',
                                        rows: 1,
                                        items: data?.fansAlsoLike ?? [],
                                    } satisfies MediaSectionState
                                }
                                onChange={() => undefined}
                            />
                        )}
                        {(data?.discography?.length ?? 0) > 0 && (
                            <DiscographyShelf
                                entries={data?.discography ?? []}
                                sort={discographySort}
                                onSortChange={setDiscographySort}
                                trackCount={discographyTrackCount}
                                locale={settings.locale}
                                onAlbumClick={(album) =>
                                    album.id
                                        ? routeHistory.goTo('/media', {
                                              kind: 'album',
                                              id: album.id,
                                          })
                                        : undefined
                                }
                                onTrackClick={(track) =>
                                    track.id
                                        ? routeHistory.goTo('/media', {
                                              kind: 'track',
                                              id: track.id,
                                          })
                                        : undefined
                                }
                            />
                        )}
                    </>
                )}

                {data?.kind === 'playlist' && (
                    <>
                        <Text size="3" weight="bold">
                            Playlist
                        </Text>
                        <MediaShelf
                            items={data?.items ?? skeletonRows}
                            variant="list"
                            orientation="vertical"
                            itemsPerColumn={6}
                            draggable={false}
                            interactive={!loading}
                            itemLoading={loading}
                        />
                    </>
                )}
            </Flex>
        </Flex>
    );
}
