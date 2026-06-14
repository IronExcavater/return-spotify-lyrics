import { Fragment, type ReactNode } from 'react';
import { Text } from '@radix-ui/themes';
import { MdMusicNote } from 'react-icons/md';

import type { RouteState } from '../../../hooks/useHistory';
import { buildMediaNavigationFromItem } from '../../../hooks/useMediaRoute';
import {
    buildMediaActions,
    resolvePrimaryPlayAction,
} from '../../../mediaActions';
import type { MediaShelfItem } from '../../../types/mediaShelf';
import { TextButton } from '../../TextButton';
import { MediaActionsMenu } from '../MediaActionsMenu';
import { MediaCard } from '../MediaCard';
import { MediaRow } from '../MediaRow';
import type { MediaShelfProps, TrackSubtitleMode } from './types';

type ShelfHistory = {
    goTo: (path: string, state?: RouteState) => void;
};

type ShelfItemViewInput = {
    cardSize?: MediaShelfProps['cardSize'];
    effectiveColumnWidth?: number;
    enablePrimaryPlay: boolean;
    getActions?: MediaShelfProps['getActions'];
    getRowProps?: MediaShelfProps['getRowProps'];
    index: number;
    item: MediaShelfItem;
    orientation: MediaShelfProps['orientation'];
    premiumPlaybackBlocked: boolean;
    routeHistory: ShelfHistory;
    seed: number;
    showImage: boolean;
    trackSubtitleMode?: TrackSubtitleMode;
    variant: MediaShelfProps['variant'];
};

type ShelfItemView = {
    canActivate: boolean;
    content: ReactNode;
    handleNavigate: () => void;
};

function renderArtistLinks({
    artists,
    limit,
    routeHistory,
}: {
    artists: MediaShelfItem['artists'];
    limit?: number;
    routeHistory: ShelfHistory;
}) {
    if (!artists || artists.length === 0) return undefined;

    const entries = limit != null ? artists.slice(0, limit) : artists;
    return entries.map((artist, index) => (
        <Fragment key={artist.id ?? `${artist.name}-${index}`}>
            <TextButton
                size="1"
                color="gray"
                interactive={Boolean(artist.id)}
                onClick={
                    artist.id
                        ? (event) => {
                              event.stopPropagation();
                              routeHistory.goTo('/media', {
                                  kind: 'artist',
                                  id: artist.id!,
                              });
                          }
                        : undefined
                }
            >
                {artist.name}
            </TextButton>
            {index < entries.length - 1 && (
                <Text as="span" size="1" color="gray">
                    {',\u00A0'}
                </Text>
            )}
        </Fragment>
    ));
}

function resolveTrackSubtitle({
    mode,
    routeHistory,
    trackItem,
}: {
    mode: TrackSubtitleMode;
    routeHistory: ShelfHistory;
    trackItem: MediaShelfItem;
}) {
    const artists = trackItem.artists;
    const fallbackArtists = trackItem.subtitle ?? '';
    const firstArtist =
        artists?.[0]?.name ??
        fallbackArtists.split(',')[0]?.trim() ??
        fallbackArtists;
    const albumName =
        trackItem.parentIsSingle ||
        (trackItem.parentTitle &&
            trackItem.parentTitle.toLowerCase() ===
                trackItem.title?.toLowerCase())
            ? undefined
            : trackItem.parentTitle;
    const albumOnClick = trackItem.parentId
        ? () =>
              routeHistory.goTo('/media', {
                  kind: 'album',
                  id: trackItem.parentId!,
              })
        : undefined;

    if (mode === 'artists') {
        return (
            renderArtistLinks({ artists, routeHistory }) ||
            fallbackArtists ||
            undefined
        );
    }

    if (mode === 'artist-album') {
        if (!firstArtist && !albumName) return undefined;

        return (
            <>
                {renderArtistLinks({ artists, limit: 1, routeHistory }) ??
                    (firstArtist ? (
                        <Text as="span" size="1" color="gray">
                            {firstArtist}
                        </Text>
                    ) : null)}
                {firstArtist && albumName && (
                    <Text as="span" size="1" color="gray">
                        {'\u00A0•\u00A0'}
                    </Text>
                )}
                {albumName &&
                    (albumOnClick ? (
                        <TextButton
                            size="1"
                            color="gray"
                            onClick={albumOnClick}
                        >
                            {albumName}
                        </TextButton>
                    ) : (
                        <Text as="span" size="1" color="gray">
                            {albumName}
                        </Text>
                    ))}
            </>
        );
    }

    return (
        renderArtistLinks({ artists, limit: 1, routeHistory }) ||
        (firstArtist ? (
            <Text as="span" size="1" color="gray">
                {firstArtist}
            </Text>
        ) : undefined)
    );
}

export function buildShelfItemView({
    cardSize,
    effectiveColumnWidth,
    enablePrimaryPlay,
    getActions,
    getRowProps,
    index,
    item,
    orientation,
    premiumPlaybackBlocked,
    routeHistory,
    seed,
    showImage,
    trackSubtitleMode,
    variant,
}: ShelfItemViewInput): ShelfItemView {
    const mode =
        trackSubtitleMode ?? (variant === 'tile' ? 'artist' : 'artist-album');
    const subtitle =
        item.kind === 'track'
            ? resolveTrackSubtitle({ mode, routeHistory, trackItem: item })
            : (renderArtistLinks({
                  artists: item.artists,
                  routeHistory,
              }) ?? item.subtitle);
    const baseActions = buildMediaActions(item, {
        premiumPlaybackBlocked,
    });
    const actions = getActions?.(item, index) ?? baseActions;
    const rowProps = getRowProps?.(item, index);
    const resolvedPosition =
        rowProps?.position ?? (item.loading ? index : undefined);
    const hasActions =
        actions.primary.length > 0 || actions.secondary.length > 0;
    const primaryPlayAction = enablePrimaryPlay
        ? (resolvePrimaryPlayAction(baseActions) ??
          resolvePrimaryPlayAction(actions))
        : undefined;
    const contextMenu =
        hasActions || item.kind === 'track' ? (
            <MediaActionsMenu actions={actions} item={item} />
        ) : null;
    const navigation = buildMediaNavigationFromItem(item);
    const handleNavigate = () => {
        if (!navigation) return;
        routeHistory.goTo(navigation.path, navigation.state);
    };
    const canActivate = !item.loading && Boolean(navigation);
    const handlePrimaryClick =
        primaryPlayAction?.disabled !== true
            ? primaryPlayAction?.onSelect
            : undefined;

    return {
        canActivate,
        handleNavigate,
        content:
            variant === 'tile' ? (
                <MediaCard
                    title={item.title}
                    subtitle={subtitle}
                    imageUrl={item.imageUrl}
                    icon={item.icon ?? <MdMusicNote />}
                    contextMenu={contextMenu}
                    contextMenuDisabled={false}
                    primaryAction={primaryPlayAction}
                    seed={seed}
                    loading={item.loading}
                    cardSize={cardSize}
                    onClick={
                        handlePrimaryClick ??
                        (canActivate ? handleNavigate : undefined)
                    }
                    onTitleClick={canActivate ? handleNavigate : undefined}
                />
            ) : (
                <MediaRow
                    title={item.title}
                    subtitle={subtitle}
                    icon={item.icon ?? <MdMusicNote />}
                    imageUrl={item.imageUrl}
                    showImage={showImage}
                    contextMenu={contextMenu}
                    contextMenuDisabled={false}
                    primaryAction={primaryPlayAction}
                    seed={seed}
                    loading={item.loading}
                    onClick={
                        handlePrimaryClick ??
                        (canActivate ? handleNavigate : undefined)
                    }
                    onTitleClick={canActivate ? handleNavigate : undefined}
                    showPosition={rowProps?.showPosition}
                    position={resolvedPosition}
                    selection={rowProps?.selection}
                    className={rowProps?.className}
                    style={
                        orientation === 'horizontal' && effectiveColumnWidth
                            ? { minWidth: effectiveColumnWidth }
                            : undefined
                    }
                />
            ),
    };
}
