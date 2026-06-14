import { useCallback, useMemo } from 'react';

import { formatDurationLong } from '../../shared/date';
import { resolveLocale, resolveMarket } from '../../shared/locale';
import { playlistToItem } from '../../shared/media';
import { DetailViewLayout } from '../components/DetailViewLayout';
import {
    DetailViewLoadingState,
    DetailViewMessage,
} from '../components/DetailViewState';
import { type HeroData } from '../components/media/MediaHero';
import { PlaylistDedupeDialog } from '../components/playlist/PlaylistDedupeDialog';
import { PlaylistDescriptionEditor } from '../components/playlist/PlaylistDescriptionEditor';
import {
    ConfirmPlaylistRemovalDialog,
    ManageCollaboratorsDialog,
} from '../components/playlist/PlaylistDialogs';
import { usePremiumPlaybackBlocked } from '../data/playbackAccess';
import {
    buildPlaylistHeroState,
    playPlaylistHero,
} from '../features/playlists/heroState';
import { PlaylistTracksSection } from '../features/playlists/PlaylistTracksSection';
import { usePlaylistContent } from '../features/playlists/usePlaylistContent';
import { usePlaylistDedupe } from '../features/playlists/usePlaylistDedupe';
import {
    usePlaylistDetailsEditor,
    usePlaylistManagement,
} from '../features/playlists/usePlaylistManagement';
import { usePlaylistTrackActions } from '../features/playlists/usePlaylistTrackActions';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import {
    playlistRouteStore,
    useStoredRouteState,
} from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';

export function PlaylistView() {
    const { settings } = useSettings();
    const { profile } = useAuth();
    const premiumRequired = usePremiumPlaybackBlocked();
    const routeHistory = useHistory();
    const locale = resolveLocale(settings.locale);
    const market = resolveMarket(settings.locale);
    const { state, restoring } = useStoredRouteState<MediaRouteState>({
        store: playlistRouteStore,
        routePath: '/playlist',
    });
    const playlistId = state?.kind === 'playlist' ? state.id : undefined;
    const { data, loading, loadMoreItems, reloadPlaylist, setData } =
        usePlaylistContent({
            active: state?.kind === 'playlist',
            locale,
            market,
            playlistId,
        });
    const detailsEditor = usePlaylistDetailsEditor({ data, setData });

    const showInitialLoading = loading && !data;

    const hero = useMemo<HeroData | null>(() => {
        if (!data) return null;
        const duration = formatDurationLong(data.totalDurationMs);
        const trackCount = data.playlist.tracks.total;
        const infoParts = [`${trackCount} tracks`].filter(Boolean);
        return {
            title: data.playlist.name,
            subtitle: data.playlist.owner?.display_name,
            info: infoParts.join(' • '),
            imageUrl: data.playlist.images?.[0]?.url,
            heroUrl: data.playlist.images?.[0]?.url,
            duration,
            item: playlistToItem(data.playlist),
        };
    }, [data]);

    const viewKey = state?.id ?? 'playlist';

    const isOwner =
        data?.playlist.owner?.id && profile?.id
            ? data.playlist.owner.id === profile.id
            : false;
    const canEdit = isOwner || Boolean(data?.playlist.collaborative);

    const dedupe = usePlaylistDedupe({
        canEdit,
        data,
        locale,
        market,
        playlistId,
        reloadPlaylist,
        showInitialLoading,
    });

    const trackActions = usePlaylistTrackActions({
        canEdit,
        data,
        premiumRequired,
        reloadPlaylist,
        setData,
    });

    const management = usePlaylistManagement({
        data,
        setData,
        profileId: profile?.id,
        canEdit,
        isOwner,
        canOpenDedupe: dedupe.canOpen,
        onEdit: detailsEditor.startEditing,
        onOpenDedupe: () => void dedupe.open(),
        onReload: reloadPlaylist,
        onRemoved: routeHistory.goBack,
    });

    const playlistHero = buildPlaylistHeroState({
        item: hero?.item,
        managementActions: management.actions,
        premiumRequired,
        titleEditor: detailsEditor,
    });

    const handleHeroPlay = useCallback(() => {
        playPlaylistHero({
            contextUri: playlistHero.contextUri,
            item: hero?.item,
            playNowAction: playlistHero.playNowAction,
            premiumRequired,
        });
    }, [
        hero?.item,
        playlistHero.contextUri,
        playlistHero.playNowAction,
        premiumRequired,
    ]);

    const reorderEnabled = canEdit && !showInitialLoading;
    const trimmedDescription = data?.playlist.description?.trim() ?? '';
    const trackItems = data?.items ?? [];
    const trackTotalCount = data?.playlist.tracks.total;

    if (!state) {
        if (restoring) return <DetailViewLoadingState />;

        return (
            <DetailViewMessage message="Select a playlist to view details." />
        );
    }

    if (!loading && !data) {
        return (
            <DetailViewMessage message="This playlist is not available yet." />
        );
    }

    return (
        <>
            <DetailViewLayout
                hero={hero}
                loading={showInitialLoading}
                heroUrl={hero?.heroUrl}
                collapseKey={viewKey}
                resetScroll={false}
                editableTitle={playlistHero.editableTitle}
                mergedHeroActions={playlistHero.mergedHeroActions}
                canTogglePlayback={playlistHero.canTogglePlayback}
                onPlay={handleHeroPlay}
                contentGap="3"
            >
                <PlaylistDescriptionEditor
                    loading={showInitialLoading}
                    canEdit={canEdit}
                    description={trimmedDescription}
                    draft={detailsEditor.draft}
                    editing={detailsEditor.editing}
                    saving={detailsEditor.saving}
                    onStartEditing={detailsEditor.startEditing}
                    onCancelEditing={detailsEditor.cancelEditing}
                    onSaveDetails={() => void detailsEditor.saveDetails()}
                    onUpdateDraft={detailsEditor.updateDraft}
                />

                <PlaylistTracksSection
                    canReorder={reorderEnabled}
                    getItemActions={trackActions.getItemActions}
                    hasMore={data?.itemsHasMore}
                    items={trackItems}
                    loading={showInitialLoading}
                    loadingMore={data?.itemsLoadingMore}
                    onLoadMore={loadMoreItems}
                    onReorder={trackActions.reorderItems}
                    totalCount={trackTotalCount}
                />
            </DetailViewLayout>
            <input
                ref={management.coverInputRef}
                type="file"
                accept="image/*"
                aria-label="Playlist cover image"
                title="Playlist cover image"
                className="hidden"
                onChange={(event) =>
                    void management.uploadCover(event.target.files?.[0])
                }
            />
            <ManageCollaboratorsDialog
                open={management.collaboratorsOpen}
                spotifyUrl={data?.playlist.external_urls?.spotify}
                onOpenChange={management.setCollaboratorsOpen}
            />
            <ConfirmPlaylistRemovalDialog
                open={management.removalOpen}
                playlistName={data?.playlist.name ?? 'Playlist'}
                removing={management.removing}
                onOpenChange={management.setRemovalOpen}
                onConfirm={() => void management.remove()}
            />
            <PlaylistDedupeDialog
                open={dedupe.dialog.open}
                onOpenChange={dedupe.setOpen}
                analysis={dedupe.analysis}
                loading={dedupe.dialog.loading}
                removing={dedupe.dialog.removing}
                onConfirm={dedupe.removeDuplicates}
            />
        </>
    );
}
