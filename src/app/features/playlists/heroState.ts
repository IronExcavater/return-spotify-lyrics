import { sendSpotifyMessage } from '../../../shared/messaging';
import type {
    MediaAction,
    MediaActionGroup,
    MediaItem,
} from '../../../shared/types';
import type { EditableHeroTitle } from '../../components/media/MediaHero';
import { updateCachedAssumedNowPlaying } from '../../hooks/mediaCacheEntries';
import { buildMediaActions, playHeroAction } from '../../mediaActions';
import type { PlaylistDetailsDraft } from './usePlaylistManagement';

type PlaylistTitleEditor = {
    draft: PlaylistDetailsDraft | null;
    editing: boolean;
    saving: boolean;
    updateDraft: (
        update: (previous: PlaylistDetailsDraft) => PlaylistDetailsDraft
    ) => void;
};

type PlaylistHeroStateInput = {
    item?: MediaItem | null;
    managementActions: MediaAction[];
    premiumRequired: boolean;
    titleEditor: PlaylistTitleEditor;
};

export type PlaylistHeroState = {
    canTogglePlayback: boolean;
    contextUri?: string;
    editableTitle?: EditableHeroTitle;
    mergedHeroActions: MediaActionGroup | null;
    playNowAction?: MediaAction;
};

export function buildPlaylistHeroState({
    item,
    managementActions,
    premiumRequired,
    titleEditor,
}: PlaylistHeroStateInput): PlaylistHeroState {
    const heroActions = item
        ? buildMediaActions(item, {
              premiumPlaybackBlocked: premiumRequired,
          })
        : null;

    return {
        canTogglePlayback: Boolean(item?.uri) && !premiumRequired,
        contextUri: item?.uri,
        editableTitle: buildEditableTitle(titleEditor),
        mergedHeroActions: heroActions
            ? {
                  primary: heroActions.primary,
                  secondary: [...heroActions.secondary, ...managementActions],
              }
            : null,
        playNowAction: heroActions?.primary.find(
            (action) => action.id === 'play-now'
        ),
    };
}

export function playPlaylistHero({
    contextUri,
    item,
    playNowAction,
    premiumRequired,
}: Pick<PlaylistHeroState, 'contextUri' | 'playNowAction'> & {
    item?: MediaItem | null;
    premiumRequired: boolean;
}) {
    playHeroAction({
        playNowAction,
        premiumRequired,
        fallback: () => {
            if (!contextUri) return;
            if (item) updateCachedAssumedNowPlaying(item);
            void sendSpotifyMessage('startPlayback', { contextUri });
        },
    });
}

function buildEditableTitle({
    draft,
    editing,
    saving,
    updateDraft,
}: PlaylistTitleEditor): EditableHeroTitle | undefined {
    if (!editing || !draft) return undefined;

    return {
        value: draft.name,
        disabled: saving,
        onChange: (name) =>
            updateDraft((previous) => ({
                ...previous,
                name,
            })),
    };
}
