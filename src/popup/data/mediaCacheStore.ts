import { createLogger, logError } from '../../shared/logging';

export type CacheKey = string;

const imageLogger = createLogger('image');
const IMAGE_CACHE_LIMIT = 50;

const imageObjectUrlBySrc = new Map<string, string>();
const imageCacheOrder: string[] = [];
const imageActiveRefs = new Map<string, number>();
const imagePendingBySrc = new Map<string, Promise<string>>();

const mediaCache = new Map<CacheKey, unknown>();
const signatures = new Map<CacheKey, string>();
const listeners = new Set<() => void>();

const setImageActive = (src: string, delta: number) => {
    const next = (imageActiveRefs.get(src) ?? 0) + delta;
    if (next <= 0) {
        imageActiveRefs.delete(src);
        return;
    }
    imageActiveRefs.set(src, next);
};

const pruneImageCache = () => {
    if (imageCacheOrder.length <= IMAGE_CACHE_LIMIT) return;

    let index = 0;
    while (
        imageCacheOrder.length > IMAGE_CACHE_LIMIT &&
        index < imageCacheOrder.length
    ) {
        const candidate = imageCacheOrder[index];
        if ((imageActiveRefs.get(candidate) ?? 0) > 0) {
            index += 1;
            continue;
        }

        imageCacheOrder.splice(index, 1);
        const objectUrl = imageObjectUrlBySrc.get(candidate);
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        imageObjectUrlBySrc.delete(candidate);
    }
};

const fetchCachedImage = (src: string): Promise<string> => {
    const cached = imageObjectUrlBySrc.get(src);
    if (cached) return Promise.resolve(cached);

    const pending = imagePendingBySrc.get(src);
    if (pending) return pending;

    const request = (async () => {
        const response = await fetch(src);
        if (!response.ok) throw new Error('image fetch failed');

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        if (!imageObjectUrlBySrc.has(src)) {
            imageObjectUrlBySrc.set(src, objectUrl);
            imageCacheOrder.push(src);
            pruneImageCache();
            return objectUrl;
        }

        const existing = imageObjectUrlBySrc.get(src)!;
        URL.revokeObjectURL(objectUrl);
        return existing;
    })();

    imagePendingBySrc.set(src, request);
    request.finally(() => {
        imagePendingBySrc.delete(src);
    });

    return request;
};

const resolveImageUrl = <T>(
    entry: T,
    imageUrl?: MediaCacheUpdateOptions<T>['imageUrl']
) => {
    if (typeof imageUrl === 'function') return imageUrl(entry);
    if (typeof imageUrl === 'string') return imageUrl;

    if (
        entry &&
        typeof entry === 'object' &&
        'imageUrl' in (entry as Record<string, unknown>)
    ) {
        const candidate = (entry as { imageUrl?: unknown }).imageUrl;
        if (typeof candidate === 'string') return candidate;
    }

    return undefined;
};

export type MediaCacheUpdateOptions<T> = {
    signature?: string;
    imageUrl?: string | ((entry: T) => string | undefined);
};

const notifyMediaCacheListeners = () => {
    listeners.forEach((listener) => listener());
};

export const subscribeToMediaCacheStore = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const readMediaCacheEntry = <T>(key: CacheKey) =>
    (mediaCache.get(key) as T | undefined) ?? null;

export const primeCachedImage = (src?: string) => {
    if (!src) return;
    void fetchCachedImage(src).catch((error) => {
        logError(imageLogger, 'Failed to cache image', error);
    });
};

export const getCachedImageSource = (src?: string) => {
    if (!src) return undefined;
    return imageObjectUrlBySrc.get(src) ?? src;
};

export const markCachedImageActive = (src?: string) => {
    if (!src) return () => undefined;
    setImageActive(src, 1);
    return () => {
        setImageActive(src, -1);
    };
};

export const updateMediaCacheEntry = <T>(
    key: CacheKey,
    entry: T | null | undefined,
    options: MediaCacheUpdateOptions<T> = {}
) => {
    if (!entry) {
        if (!mediaCache.has(key)) return;
        mediaCache.delete(key);
        signatures.delete(key);
        notifyMediaCacheListeners();
        return;
    }

    const signature = options.signature ?? JSON.stringify(entry);
    if (signatures.get(key) === signature) return;

    mediaCache.set(key, entry);
    signatures.set(key, signature);
    primeCachedImage(resolveImageUrl(entry, options.imageUrl));
    notifyMediaCacheListeners();
};
