import { useEffect, useState } from 'react';

const MAX_IMAGE_CACHE = 50;
const imageCache = new Map<string, string>();
const imageOrder: string[] = [];
const activeCounts = new Map<string, number>();

const setActive = (src: string, delta: number) => {
    const next = (activeCounts.get(src) ?? 0) + delta;
    if (next <= 0) activeCounts.delete(src);
    else activeCounts.set(src, next);
};

const pruneCache = () => {
    if (imageOrder.length <= MAX_IMAGE_CACHE) return;
    let idx = 0;
    while (imageOrder.length > MAX_IMAGE_CACHE && idx < imageOrder.length) {
        const candidate = imageOrder[idx];
        if ((activeCounts.get(candidate) ?? 0) > 0) {
            idx += 1;
            continue;
        }
        imageOrder.splice(idx, 1);
        const old = imageCache.get(candidate);
        if (old) URL.revokeObjectURL(old);
        imageCache.delete(candidate);
    }
};

const cacheImage = async (src: string) => {
    const cached = imageCache.get(src);
    if (cached) return cached;

    const resp = await fetch(src);
    if (!resp.ok) throw new Error('image fetch failed');
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    imageCache.set(src, objectUrl);
    imageOrder.push(src);
    pruneCache();
    return objectUrl;
};

export function useCachedImage(src?: string) {
    const [cachedSrc, setCachedSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;
        if (!src) {
            setCachedSrc(undefined);
            return;
        }

        setActive(src, 1);

        const cached = imageCache.get(src);
        if (cached) {
            setCachedSrc(cached);
            return () => {
                cancelled = true;
                setActive(src, -1);
            };
        }

        void cacheImage(src)
            .then((url) => {
                if (!cancelled) setCachedSrc(url);
            })
            .catch((error) => {
                console.warn('[image] Failed to cache image', error);
                if (!cancelled) setCachedSrc(src);
            });

        return () => {
            cancelled = true;
            setActive(src, -1);
        };
    }, [src]);

    return cachedSrc ?? src;
}
