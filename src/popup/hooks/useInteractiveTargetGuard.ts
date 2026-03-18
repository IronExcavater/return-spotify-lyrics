import { useCallback } from 'react';

const DEFAULT_INTERACTIVE_TARGET_SELECTORS = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="menuitem"]',
    '[role="option"]',
    '[contenteditable="true"]',
    '[data-title-hover-stop="true"]',
];

type UseInteractiveTargetGuardOptions = {
    additionalSelectors?: string[];
    ignoreWithinSelectors?: string[];
};

export function useInteractiveTargetGuard({
    additionalSelectors = [],
    ignoreWithinSelectors = [],
}: UseInteractiveTargetGuardOptions = {}) {
    const interactiveSelector = [
        ...DEFAULT_INTERACTIVE_TARGET_SELECTORS,
        ...additionalSelectors,
    ].join(', ');
    const ignoreWithinSelector = ignoreWithinSelectors.join(', ');

    const isInteractiveTarget = useCallback(
        (target: EventTarget | null) => {
            const element = target instanceof Element ? target : null;
            if (!element) return false;

            if (
                ignoreWithinSelector &&
                element.closest(ignoreWithinSelector) != null
            ) {
                return true;
            }

            return element.closest(interactiveSelector) != null;
        },
        [ignoreWithinSelector, interactiveSelector]
    );

    return { isInteractiveTarget };
}
