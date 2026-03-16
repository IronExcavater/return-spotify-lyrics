import { useEffect, useState } from 'react';
import { DropdownMenu } from '@radix-ui/themes';
import type {
    MediaAction,
    MediaActionGroup,
    MediaItem,
} from '../../shared/types';
import { canManageTrackPlaylists } from '../data/trackPlaylists';
import {
    createMediaActionShortcutHandler,
    flattenMediaActions,
} from '../hooks/useMediaActions';
import { useOverlaySurface } from '../hooks/useOverlaySurface';
import { PlaylistPicker } from './PlaylistPicker';

type Align = 'start' | 'center' | 'end';
type Size = '1' | '2';

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
    const [view, setView] = useState<'actions' | 'playlists'>('actions');
    const canManagePlaylists = canManageTrackPlaylists(item);
    const itemKey = item?.id ?? item?.uri ?? item?.title ?? '';

    useEffect(() => {
        setView('actions');
    }, [itemKey, canManagePlaylists]);

    const resetView = () => {
        setView('actions');
    };
    const overlay = useOverlaySurface({ onClose: resetView });

    const managePlaylistsAction: MediaAction | null = canManagePlaylists
        ? {
              id: 'manage-playlists',
              label: 'Manage playlists',
              shortcut: 'P',
              onSelect: () => setView('playlists'),
          }
        : null;
    const mergedActions: MediaActionGroup | null =
        actions || managePlaylistsAction
            ? {
                  primary: [
                      ...(actions?.primary ?? []),
                      ...(managePlaylistsAction ? [managePlaylistsAction] : []),
                  ],
                  secondary: actions?.secondary ?? [],
              }
            : null;

    if (!mergedActions) return null;
    const allActions = flattenMediaActions(mergedActions);
    if (allActions.length === 0) return null;
    const handleShortcutKeyDown = createMediaActionShortcutHandler(allActions);
    const handleSelect =
        (action: (typeof allActions)[number]) => (event: Event) => {
            if (action.id === 'manage-playlists') {
                event.preventDefault();
            }
            event.stopPropagation();
            action.onSelect();
        };

    if (view === 'playlists' && canManagePlaylists) {
        return (
            <DropdownMenu.Content
                align={align}
                size={size}
                className="min-w-0 overflow-hidden p-0!"
                style={{
                    padding: 0,
                    boxSizing: 'border-box',
                    width: '19rem',
                    maxWidth:
                        'min(calc(100vw - 0.75rem), var(--radix-dropdown-menu-content-available-width, 19rem))',
                }}
                {...overlay.boundaryProps}
                {...overlay.dismissProps}
            >
                <PlaylistPicker item={item} onBack={() => setView('actions')} />
            </DropdownMenu.Content>
        );
    }

    return (
        <DropdownMenu.Content
            align={align}
            size={size}
            onKeyDown={(event) => handleShortcutKeyDown(event.nativeEvent)}
            {...overlay.boundaryProps}
            {...overlay.dismissProps}
        >
            {mergedActions.primary.map((action) => (
                <DropdownMenu.Item
                    key={action.id}
                    shortcut={action.shortcut}
                    onSelect={handleSelect(action)}
                >
                    {action.label}
                </DropdownMenu.Item>
            ))}
            {mergedActions.primary.length > 0 &&
                mergedActions.secondary.length > 0 && (
                    <DropdownMenu.Separator />
                )}
            {mergedActions.secondary.map((action) => (
                <DropdownMenu.Item
                    key={action.id}
                    shortcut={action.shortcut}
                    onSelect={handleSelect(action)}
                >
                    {action.label}
                </DropdownMenu.Item>
            ))}
        </DropdownMenu.Content>
    );
}
