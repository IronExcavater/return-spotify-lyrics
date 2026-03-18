import { useEffect, useState, useSyncExternalStore } from 'react';

import {
    getCachedImageSource,
    markCachedImageActive,
    primeCachedImage,
    readMediaCacheEntry,
    subscribeToMediaCacheStore,
    type CacheKey,
    type MediaCacheUpdateOptions,
    updateMediaCacheEntry,
} from '../data/mediaCacheStore';

export function useCachedImage(src?: string) {
    const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() => {
        return getCachedImageSource(src);
    });

    useEffect(() => {
        if (!src) {
            setResolvedSrc(undefined);
            return;
        }

        const release = markCachedImageActive(src);

        const cached = getCachedImageSource(src);
        if (cached && cached !== src) {
            setResolvedSrc(cached);
            return release;
        }

        setResolvedSrc(src);
        primeCachedImage(src);
        return release;
    }, [src]);

    return resolvedSrc ?? src;
}

export const useMediaCacheEntry = <T>(key: CacheKey) =>
    useSyncExternalStore(
        subscribeToMediaCacheStore,
        () => readMediaCacheEntry<T>(key),
        () => readMediaCacheEntry<T>(key)
    );

export { primeCachedImage, updateMediaCacheEntry };
export type { CacheKey, MediaCacheUpdateOptions };
