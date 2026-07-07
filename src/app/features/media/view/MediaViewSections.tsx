import type { MediaItem } from '../../../../shared/types';
import { DiscographyShelf } from '../../../components/media/DiscographyShelf';
import {
    MediaSection,
    type MediaSectionState,
} from '../../../components/media/MediaSection';
import type { AlbumViewData, ArtistViewData, ShowViewData } from '../data';

const noopSectionChange = () => undefined;

function buildAlbumTracksSection(
    albumData: AlbumViewData | null
): MediaSectionState {
    return {
        id: 'album-tracks',
        title: albumData?.album.name ?? 'Album',
        view: 'list',
        trackSubtitleMode: 'artists',
        items: albumData?.tracks ?? [],
    };
}

function buildAlbumPopularSection(items: MediaItem[]): MediaSectionState {
    return {
        id: 'album-recommended',
        title: 'Popular',
        view: 'list',
        trackSubtitleMode: 'artist-album',
        items,
    };
}

function buildAlbumRecommendedSection(
    albumData: AlbumViewData | null
): MediaSectionState {
    return {
        id: 'album-recommended-albums',
        title: 'Recommended',
        view: 'list',
        infinite: 'rows',
        rows: 0,
        trackSubtitleMode: 'artist-album',
        items: albumData?.recommended ?? [],
    };
}

function buildShowEpisodesSection(
    showData: ShowViewData | null,
    isLoadingView: boolean
): MediaSectionState {
    return {
        id: 'show-episodes',
        title: showData?.show.name ?? 'Show',
        subtitle: ['Show', showData?.releaseYear]
            .filter(Boolean)
            .join(' \u2022 '),
        view: 'list',
        infinite: 'rows',
        rows: 0,
        items: showData?.episodes ?? [],
        hasMore: isLoadingView ? false : showData?.episodesHasMore,
        loadingMore: isLoadingView ? false : showData?.episodesLoadingMore,
    };
}

function buildShowRecommendedSection(
    showData: ShowViewData | null
): MediaSectionState {
    return {
        id: 'show-recommended',
        title: 'Recommended',
        view: 'list',
        infinite: 'rows',
        rows: 0,
        items: showData?.recommended ?? [],
    };
}

function buildArtistPopularSection(
    artistData: ArtistViewData | null
): MediaSectionState {
    return {
        id: 'artist-popular',
        title: 'Popular',
        view: 'list',
        trackSubtitleMode: 'artist-album',
        items: artistData?.topTracks ?? [],
    };
}

function buildArtistRelatedSection(
    artistData: ArtistViewData | null
): MediaSectionState {
    return {
        id: 'artist-fans-also-like',
        title: 'Related artists',
        view: 'card',
        cardSize: 3,
        rows: 1,
        items: artistData?.relatedArtists ?? [],
    };
}

function buildArtistRecommendedSection(
    artistData: ArtistViewData | null
): MediaSectionState {
    return {
        id: 'artist-recommended',
        title: 'Recommended',
        view: 'list',
        infinite: 'rows',
        rows: 0,
        trackSubtitleMode: 'artist-album',
        items: artistData?.recommended ?? [],
    };
}

export type AlbumSectionsProps = {
    albumData: AlbumViewData | null;
    isLoadingView: boolean;
    onTitleClick?: () => void;
    popularAlbumTracks: MediaItem[];
    popularLoading: boolean;
    recommendedLoading: boolean;
    shouldShowAlbumSection: boolean;
};

export function AlbumSections({
    albumData,
    isLoadingView,
    onTitleClick,
    popularAlbumTracks,
    popularLoading,
    recommendedLoading,
    shouldShowAlbumSection,
}: AlbumSectionsProps) {
    const showPopular = popularLoading || popularAlbumTracks.length > 0;
    const showRecommended =
        recommendedLoading || (albumData?.recommended.length ?? 0) > 0;

    return (
        <>
            {shouldShowAlbumSection && (
                <MediaSection
                    editing={false}
                    loading={isLoadingView}
                    headerLoading={false}
                    onTitleClick={onTitleClick}
                    section={buildAlbumTracksSection(albumData)}
                    onChange={noopSectionChange}
                />
            )}
            {showPopular && (
                <MediaSection
                    editing={false}
                    loading={popularLoading}
                    headerLoading={false}
                    section={buildAlbumPopularSection(popularAlbumTracks)}
                    onChange={noopSectionChange}
                />
            )}
            {showRecommended && (
                <MediaSection
                    editing={false}
                    loading={recommendedLoading}
                    headerLoading={false}
                    section={buildAlbumRecommendedSection(albumData)}
                    onChange={noopSectionChange}
                />
            )}
        </>
    );
}

export type ShowSectionsProps = {
    isLoadingView: boolean;
    onLoadMore: () => Promise<void>;
    recommendedLoading: boolean;
    showData: ShowViewData | null;
};

export function ShowSections({
    isLoadingView,
    onLoadMore,
    recommendedLoading,
    showData,
}: ShowSectionsProps) {
    const showRecommended =
        recommendedLoading || (showData?.recommended.length ?? 0) > 0;

    return (
        <>
            <MediaSection
                editing={false}
                loading={isLoadingView}
                headerLoading={false}
                section={buildShowEpisodesSection(showData, isLoadingView)}
                onChange={noopSectionChange}
                onLoadMore={onLoadMore}
            />
            {showRecommended && (
                <MediaSection
                    editing={false}
                    loading={recommendedLoading}
                    headerLoading={false}
                    section={buildShowRecommendedSection(showData)}
                    onChange={noopSectionChange}
                />
            )}
        </>
    );
}

export type ArtistSectionsProps = {
    artistData: ArtistViewData | null;
    discographySort: 'newest' | 'oldest';
    discographyShowAppearances: boolean;
    discographyTrackCount: number;
    isLoadingView: boolean;
    locale: string;
    onAlbumClick: (album: { id?: string | null }) => void;
    onLoadMore: () => Promise<void>;
    onShowAppearancesChange: (showAppearances: boolean) => void;
    onSortChange: (sort: 'newest' | 'oldest') => void;
    onTrackClick: (track: { id?: string | null }) => void;
    recommendedLoading: boolean;
};

export function ArtistSections({
    artistData,
    discographySort,
    discographyShowAppearances,
    discographyTrackCount,
    isLoadingView,
    locale,
    onAlbumClick,
    onLoadMore,
    onShowAppearancesChange,
    onSortChange,
    onTrackClick,
    recommendedLoading,
}: ArtistSectionsProps) {
    const showPopular =
        isLoadingView || (artistData?.topTracks.length ?? 0) > 0;
    const showDiscography =
        isLoadingView || (artistData?.discography.length ?? 0) > 0;
    const showRecommended =
        recommendedLoading || (artistData?.recommended.length ?? 0) > 0;

    return (
        <>
            {showPopular && (
                <MediaSection
                    editing={false}
                    loading={isLoadingView}
                    headerLoading={false}
                    section={buildArtistPopularSection(artistData)}
                    onChange={noopSectionChange}
                />
            )}
            <MediaSection
                editing={false}
                loading={Boolean(
                    isLoadingView || artistData?.relatedArtistsLoading
                )}
                headerLoading={false}
                section={buildArtistRelatedSection(artistData)}
                onChange={noopSectionChange}
            />
            {showRecommended && (
                <MediaSection
                    editing={false}
                    loading={recommendedLoading}
                    headerLoading={false}
                    section={buildArtistRecommendedSection(artistData)}
                    onChange={noopSectionChange}
                />
            )}
            {showDiscography && (
                <DiscographyShelf
                    entries={artistData?.discography ?? []}
                    sort={discographySort}
                    onSortChange={onSortChange}
                    trackCount={discographyTrackCount}
                    locale={locale}
                    showAppearances={discographyShowAppearances}
                    onShowAppearancesChange={onShowAppearancesChange}
                    loading={isLoadingView}
                    hasMore={artistData?.discographyHasMore}
                    loadingMore={artistData?.discographyLoadingMore}
                    onLoadMore={onLoadMore}
                    onAlbumClick={onAlbumClick}
                    onTrackClick={onTrackClick}
                />
            )}
        </>
    );
}
