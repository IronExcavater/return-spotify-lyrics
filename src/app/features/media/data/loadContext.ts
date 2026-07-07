import type { Dispatch, SetStateAction } from 'react';
import type { Market } from '@spotify/web-api-ts-sdk';

import {
    createLogger,
    createOptionalRequestLogger,
} from '../../../../shared/logging';
import type { MediaContextRouteState, MediaDataState } from '../model/types';

export const mediaDataLogger = createLogger('media');
export const logOptionalError = createOptionalRequestLogger(mediaDataLogger);
export const logOptionalNotFound = createOptionalRequestLogger(
    mediaDataLogger,
    'optional request failed',
    (error) => /\b404\b/.test(error.message)
);

export type SetMediaData = Dispatch<SetStateAction<MediaDataState | null>>;
export type IsStale = () => boolean;
export type MediaDataKind = MediaDataState['kind'];
export type MediaDataByKind<K extends MediaDataKind> = Extract<
    MediaDataState,
    { kind: K }
>;

export type DiscographyLoadOptions = {
    trackCount: number;
    includeAppearances: boolean;
};

export type MediaDataLoadContext = {
    market: Market;
    locale: string;
    discography: DiscographyLoadOptions;
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
};

export type MediaDataLoadRequest = {
    route: MediaContextRouteState;
    context: MediaDataLoadContext;
};

export function setIfFresh(
    isStale: IsStale,
    setData: SetMediaData,
    updater: SetStateAction<MediaDataState | null>
) {
    if (isStale()) return;
    setData(updater);
}

export function patchByKind<K extends MediaDataKind>(
    isStale: IsStale,
    setData: SetMediaData,
    kind: K,
    patch: (prev: MediaDataByKind<K>) => MediaDataByKind<K>
) {
    setIfFresh(isStale, setData, (prev) => {
        if (!prev || prev.kind !== kind) return prev;
        return patch(prev as MediaDataByKind<K>);
    });
}

export async function requestOptional<T>(
    request: () => Promise<T>,
    onError: (error: unknown) => void = logOptionalError
) {
    try {
        return await request();
    } catch (error) {
        onError(error);
        return null;
    }
}
