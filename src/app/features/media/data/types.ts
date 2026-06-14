import type {
    Album,
    Artist,
    Show,
    SimplifiedEpisode,
    SimplifiedTrack,
} from '@spotify/web-api-ts-sdk';

import type { MediaItem } from '../../../../shared/types';
import type { DiscographyEntry } from '../../../components/media/DiscographyShelf';
import type { MediaRouteState } from '../../../hooks/useMediaRoute';

export type MediaDataState =
    | {
          kind: 'album';
          album: Album;
          tracks: MediaItem[];
          trackLookup: Record<string, SimplifiedTrack>;
          totalDurationMs: number;
          selectedId?: string;
          selectedTrack?: SimplifiedTrack | null;
          artistTopTracks: MediaItem[];
          relatedArtists: MediaItem[];
          recommended: MediaItem[];
          popularLoading: boolean;
          relatedArtistsLoading: boolean;
          recommendedLoading: boolean;
      }
    | {
          kind: 'show';
          show: Show;
          episodes: MediaItem[];
          episodeLookup: Record<string, SimplifiedEpisode>;
          totalDurationMs: number;
          selectedId?: string;
          selectedEpisode?: SimplifiedEpisode | null;
          releaseYear?: string;
          episodesOffset: number;
          episodesHasMore: boolean;
          episodesLoadingMore: boolean;
          recommended: MediaItem[];
          recommendedLoading: boolean;
      }
    | {
          kind: 'artist';
          artist: Artist;
          topTracks: MediaItem[];
          discography: DiscographyEntry[];
          discographyOffset: number;
          discographyHasMore: boolean;
          discographyLoadingMore: boolean;
          relatedArtists: MediaItem[];
          recommended: MediaItem[];
          relatedArtistsLoading: boolean;
          recommendedLoading: boolean;
      };

export type AlbumViewData = Extract<MediaDataState, { kind: 'album' }>;
export type ShowViewData = Extract<MediaDataState, { kind: 'show' }>;
export type ArtistViewData = Extract<MediaDataState, { kind: 'artist' }>;
export type TrackOrEpisodeRouteState = MediaRouteState & {
    kind: 'track' | 'episode';
};
export type MediaContextRouteState = MediaRouteState & {
    kind: 'album' | 'show' | 'artist';
};
