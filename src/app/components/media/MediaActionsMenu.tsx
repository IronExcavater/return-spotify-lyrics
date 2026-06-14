import { useEffect, useState } from 'react';
import { DropdownMenu, Flex, Text, Tooltip } from '@radix-ui/themes';
import type {
    MediaAction,
    MediaActionGroup,
    MediaIconAction,
    MediaItem,
} from '../../../shared/types';
import { useDropdownSurface } from '../../hooks/useDropdownSurface';
import { TRACK_PLAYLISTS_ACTION_ID } from '../../mediaActions';
import { createMediaActionShortcutHandler } from '../../mediaActions/shortcuts';
import { BackButton } from '../BackButton';
import { PlaylistPicker } from '../playlist/PlaylistPicker';

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

const isIconAction = (action: MediaAction): action is MediaIconAction =>
    action.presentation === 'icon';

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
    const secondaryMenuActions = secondaryActions.filter(
        (action) => !isIconAction(action)
    );
    const secondaryIconActions = secondaryActions.filter(isIconAction);
    const allActions = [...primaryActions, ...secondaryActions];
    const hasPlaylistAction = allActions.some(
        (action) => action.id === TRACK_PLAYLISTS_ACTION_ID
    );
    const showSecondarySeparator =
        secondaryMenuActions.length > 0 && primaryActions.length > 0;

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
            disabled={action.disabled}
            onSelect={(event) => handleActionSelect(action, event)}
        >
            {action.label}
        </DropdownMenu.Item>
    );

    const renderShareAction = (action: MediaIconAction) => {
        const Icon = action.icon;
        const tooltip = action.tooltip ?? action.label;

        return (
            <Tooltip key={action.id} content={tooltip} className="shadow-lg">
                <DropdownMenu.Item
                    asChild
                    onSelect={(event) => handleActionSelect(action, event)}
                >
                    <button
                        type="button"
                        aria-label={tooltip}
                        className="w-6! justify-center! p-0!"
                    >
                        <Icon />
                    </button>
                </DropdownMenu.Item>
            </Tooltip>
        );
    };

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
                    {secondaryMenuActions.map(renderActionItem)}
                    {secondaryIconActions.length > 0 && (
                        <Flex
                            align="center"
                            justify="between"
                            pl="2"
                            role="group"
                            aria-label="Share actions"
                        >
                            <Text as="span" size={size}>
                                Share
                            </Text>
                            <Flex align="center" gap="1">
                                {secondaryIconActions.map(renderShareAction)}
                            </Flex>
                        </Flex>
                    )}
                </>
            )}
        </DropdownMenu.Content>
    );
}
