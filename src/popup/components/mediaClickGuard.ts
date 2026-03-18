const MEDIA_INTERACTIVE_SELECTOR = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="menuitem"]',
    '[role="option"]',
    '[contenteditable="true"]',
    '[data-title-hover-stop="true"]',
].join(', ');

export const isMediaInteractiveTarget = (target: EventTarget | null) => {
    const element = target instanceof Element ? target : null;
    if (!element) return false;
    return Boolean(element.closest(MEDIA_INTERACTIVE_SELECTOR));
};
