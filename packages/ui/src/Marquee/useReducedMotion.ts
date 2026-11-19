import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
    const media = matchMedia(QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

function isReduced() {
    return matchMedia(QUERY).matches;
}

/** Whether the person asks the system for less motion. */
export default function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, isReduced);
}
