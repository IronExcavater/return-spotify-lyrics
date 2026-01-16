import type { KeyboardEvent } from 'react';

import type { MediaAction } from './mediaActions';

const shortcutMatches = (shortcut: string, event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    if (shortcut === '↵') return event.key === 'Enter';
    return event.key.toLowerCase() === shortcut.toLowerCase();
};

export const createMenuShortcutHandler =
    (actions: MediaAction[]) => (event: KeyboardEvent) => {
        const action = actions.find(
            (item) => item.shortcut && shortcutMatches(item.shortcut, event)
        );
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        action.onSelect();
    };
