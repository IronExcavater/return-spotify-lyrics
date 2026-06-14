import type { MediaAction } from '../../shared/types';

function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    if (target.closest('[contenteditable="true"]')) return true;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function shortcutMatches(shortcut: string, event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    if (shortcut === 'Enter') return event.key === 'Enter';
    return event.key.toLowerCase() === shortcut.toLowerCase();
}

export const createMediaActionShortcutHandler =
    (actions: MediaAction[]) => (event: KeyboardEvent) => {
        if (isEditableTarget(event.target)) return;

        const action = actions.find(
            (item) =>
                !item.disabled &&
                item.shortcut &&
                shortcutMatches(item.shortcut, event)
        );
        if (!action) return;

        event.preventDefault();
        event.stopPropagation();
        action.onSelect();
    };
