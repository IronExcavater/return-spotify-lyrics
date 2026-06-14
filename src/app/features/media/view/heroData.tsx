import { Fragment } from 'react';
import { Text, Tooltip } from '@radix-ui/themes';
import type {
    Album,
    SimplifiedEpisode,
    SimplifiedTrack,
} from '@spotify/web-api-ts-sdk';

import {
    formatDurationLong,
    formatDurationShort,
    formatIsoDate,
} from '../../../../shared/date';
import {
    albumToItem,
    albumTrackToItem,
    artistToItem,
    formatAlbumType,
    showEpisodeToItem,
    showToItem,
} from '../../../../shared/media';
import type { HeroData } from '../../../components/media/MediaHero';
import { TextButton } from '../../../components/TextButton';
import type { MediaDataState } from '../data';

type HeroRoutes = {
    goToArtist: (id: string) => void;
    goToShow: (id: string) => void;
};

function buildReleaseInfo(album: Album, locale: string) {
    const albumType = formatAlbumType(album);
    const year = formatIsoDate(album.release_date, { year: 'numeric' }, locale);
    const fullDate = formatIsoDate(
        album.release_date,
        { dateStyle: 'long' },
        locale
    );

    if (!albumType && !year) return undefined;

    return (
        <>
            {albumType && <span>{albumType}</span>}
            {albumType && year && <span>{' \u2022 '}</span>}
            {year &&
                (fullDate ? (
                    <Tooltip content={fullDate}>
                        <span>{year}</span>
                    </Tooltip>
                ) : (
                    <span>{year}</span>
                ))}
        </>
    );
}

function renderArtistNames(
    artists: Array<{ id?: string | null; name: string }>,
    routes: HeroRoutes
) {
    return (
        <span className="min-w-0">
            {artists.map((artist, index) => {
                const artistId = artist.id;
                const onClick = artistId
                    ? () => routes.goToArtist(artistId)
                    : undefined;

                return (
                    <Fragment key={artist.id ?? artist.name}>
                        <TextButton
                            onClick={onClick}
                            interactive={Boolean(onClick)}
                            size="2"
                            weight="medium"
                            color="gray"
                        >
                            {artist.name}
                        </TextButton>
                        {index < artists.length - 1 && (
                            <Text as="span" size="2" color="gray">
                                {',\u00A0'}
                            </Text>
                        )}
                    </Fragment>
                );
            })}
        </span>
    );
}

export function buildMediaHeroData(
    data: MediaDataState | null,
    options: {
        locale: string;
        settingsLocale: string;
        routes: HeroRoutes;
        selectedTrack?: SimplifiedTrack | null;
        selectedEpisode?: SimplifiedEpisode | null;
    }
): HeroData | null {
    if (!data) return null;

    if (data.kind === 'album') {
        const selectedTrack =
            options.selectedTrack !== undefined
                ? options.selectedTrack
                : data.selectedTrack;

        if (selectedTrack) {
            return {
                title: selectedTrack.name,
                subtitle: renderArtistNames(
                    selectedTrack.artists,
                    options.routes
                ),
                info: buildReleaseInfo(data.album, options.settingsLocale),
                imageUrl: data.album.images?.[0]?.url,
                heroUrl: data.album.images?.[0]?.url,
                duration: formatDurationShort(selectedTrack.duration_ms),
                item: albumTrackToItem(selectedTrack, data.album),
            };
        }

        return {
            title: data.album.name,
            subtitle: renderArtistNames(data.album.artists, options.routes),
            info: buildReleaseInfo(data.album, options.settingsLocale),
            imageUrl: data.album.images?.[0]?.url,
            heroUrl: data.album.images?.[0]?.url,
            duration: formatDurationLong(data.totalDurationMs),
            item: albumToItem(data.album),
        };
    }

    if (data.kind === 'show') {
        const selectedEpisode =
            options.selectedEpisode !== undefined
                ? options.selectedEpisode
                : data.selectedEpisode;

        if (selectedEpisode) {
            return {
                title: selectedEpisode.name,
                subtitle: data.show.id ? (
                    <TextButton
                        onClick={() => options.routes.goToShow(data.show.id)}
                    >
                        {data.show.name}
                    </TextButton>
                ) : (
                    data.show.name
                ),
                info: data.show.publisher,
                imageUrl: data.show.images?.[0]?.url,
                heroUrl: data.show.images?.[0]?.url,
                duration: formatDurationShort(selectedEpisode.duration_ms),
                item: showEpisodeToItem(
                    selectedEpisode,
                    data.show,
                    options.settingsLocale
                ),
            };
        }

        return {
            title: data.show.name,
            subtitle: `${data.show.total_episodes} episodes`,
            info: data.show.publisher,
            imageUrl: data.show.images?.[0]?.url,
            heroUrl: data.show.images?.[0]?.url,
            duration: formatDurationLong(data.totalDurationMs),
            item: showToItem(data.show),
        };
    }

    if (data.kind === 'artist') {
        const followerTotal = data.artist.followers?.total;
        const genres =
            data.artist.genres?.map((genre) =>
                genre.replace(/\b\w/g, (char) => char.toUpperCase())
            ) ?? [];

        return {
            title: data.artist.name,
            subtitle:
                followerTotal != null
                    ? `${followerTotal.toLocaleString(options.locale)} followers`
                    : undefined,
            info: genres.slice(0, 3).join(' \u2022 '),
            imageUrl: data.artist.images?.[0]?.url,
            heroUrl: data.artist.images?.[0]?.url,
            item: artistToItem(data.artist),
        };
    }

    return null;
}
