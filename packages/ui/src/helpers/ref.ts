import type { Ref } from 'react';

/**
 * Joins refs into one callback ref, so a component keeps its own ref to an element and still gives it to the caller.
 * When the element goes, a callback ref's own cleanup runs, or the ref gets `null` if it has no cleanup.
 */
export function composeRefs<T>(
    ...refs: (Ref<T> | undefined)[]
): (node: T | null) => () => void {
    return (node) => {
        const detachers = refs.map(
            (ref) => attach(ref, node) ?? (() => attach(ref, null))
        );
        return () => {
            for (const detach of detachers) detach();
        };
    };
}

function attach<T>(
    ref: Ref<T> | undefined,
    node: T | null
): (() => void) | undefined {
    if (typeof ref === 'function') {
        const cleanup = ref(node);
        return typeof cleanup === 'function' ? cleanup : undefined;
    }
    if (ref) ref.current = node;
    return undefined;
}
