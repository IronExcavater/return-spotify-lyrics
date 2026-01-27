import { DropdownMenu } from '@radix-ui/themes';
import type { MediaActionGroup } from '../../shared/types';
import {
    createMediaActionShortcutHandler,
    flattenMediaActions,
} from '../hooks/useMediaActions';

type Align = 'start' | 'center' | 'end';
type Size = '1' | '2';

type Props = {
    actions?: MediaActionGroup | null;
    align?: Align;
    size?: Size;
};

export function MediaActionsMenu({
    actions,
    align = 'end',
    size = '1',
}: Props) {
    if (!actions) return null;
    const allActions = flattenMediaActions(actions);
    if (allActions.length === 0) return null;
    const handleShortcutKeyDown = createMediaActionShortcutHandler(allActions);
    const handleSelect =
        (action: (typeof allActions)[number]) => (event: Event) => {
            event.stopPropagation();
            action.onSelect();
        };
    return (
        <DropdownMenu.Content
            align={align}
            size={size}
            onKeyDown={(event) => handleShortcutKeyDown(event.nativeEvent)}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            {actions.primary.map((action) => (
                <DropdownMenu.Item
                    key={action.id}
                    shortcut={action.shortcut}
                    onSelect={handleSelect(action)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    {action.label}
                </DropdownMenu.Item>
            ))}
            {actions.primary.length > 0 && actions.secondary.length > 0 && (
                <DropdownMenu.Separator />
            )}
            {actions.secondary.map((action) => (
                <DropdownMenu.Item
                    key={action.id}
                    shortcut={action.shortcut}
                    onSelect={handleSelect(action)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    {action.label}
                </DropdownMenu.Item>
            ))}
        </DropdownMenu.Content>
    );
}
