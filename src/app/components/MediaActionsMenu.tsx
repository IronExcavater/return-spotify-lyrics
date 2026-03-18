import { useEffect, useState } from 'react';
import { DropdownMenu } from '@radix-ui/themes';
import type {
    MediaAction,
    MediaActionGroup,
    MediaItem,
} from '../../shared/types';
import { useDropdownSurface } from '../hooks/useDropdownSurface';
import {
    createMediaActionShortcutHandler,
    TRACK_PLAYLISTS_ACTION_ID,
} from '../hooks/useMediaActions';
import { BackButton } from './BackButton';
import { PlaylistPicker } from './PlaylistPicker';

type Align = 'start' | 'center' | 'end';
type Size = '1' | '2';
type MenuView = 'actions' | 'playlists';
type PreventDefaultEvent = {
    preventDefault: () => void;
};

type Props = {
    actions?: MediaActionGroup | null;
    item?: MediaItem | null;
    align?: Align;
    size?: Size;
};

export function MediaActionsMenu({
    actions,
    item,
    align = 'end',
    size = '1',
}: Props) {
    const itemKey = item?.id ?? item?.uri ?? item?.title ?? '';
    const [view, setView] = useState<MenuView>('actions');
    const primaryActions = actions?.primary ?? [];
    const secondaryActions = actions?.secondary ?? [];
    const allActions = [...primaryActions, ...secondaryActions];
    const hasPlaylistAction = allActions.some(
        (action) => action.id === TRACK_PLAYLISTS_ACTION_ID
    );
    const showSecondarySeparator =
        secondaryActions.length > 0 && primaryActions.length > 0;

    useEffect(() => {
        setView('actions');
    }, [itemKey, hasPlaylistAction]);

    const { contentProps } = useDropdownSurface({
        onClosed: () => setView('actions'),
        resetKey: `${itemKey}:${view}`,
    });

    if (allActions.length === 0) {
        return null;
    }

    const handleActionSelect = (
        action: MediaAction,
        event?: PreventDefaultEvent
    ) => {
        if (action.id === TRACK_PLAYLISTS_ACTION_ID) {
            event?.preventDefault();
            setView('playlists');
            return;
        }
        action.onSelect();
    };

    const handleShortcutKeyDown = createMediaActionShortcutHandler(
        allActions.map((action) => ({
            ...action,
            onSelect: () => handleActionSelect(action),
        }))
    );

    const renderActionItem = (action: MediaAction) => (
        <DropdownMenu.Item
            key={action.id}
            shortcut={action.shortcut}
            onSelect={(event) => handleActionSelect(action, event)}
        >
            {action.label}
        </DropdownMenu.Item>
    );

    return (
        <DropdownMenu.Content
            align={align}
            size={size}
            className={view === 'playlists' ? 'search-list-surface' : undefined}
            onKeyDown={
                view === 'actions'
                    ? (event) => handleShortcutKeyDown(event.nativeEvent)
                    : undefined
            }
            {...contentProps}
        >
            {view === 'playlists' ? (
                <PlaylistPicker
                    item={item}
                    headerStart={
                        <BackButton onClick={() => setView('actions')} />
                    }
                />
            ) : (
                <>
                    {primaryActions.map(renderActionItem)}
                    {showSecondarySeparator && <DropdownMenu.Separator />}
                    {secondaryActions.map(renderActionItem)}
                </>
            )}
        </DropdownMenu.Content>
    );
}
