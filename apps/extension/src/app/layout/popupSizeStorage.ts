import type { ResizeMode } from '@return-spotify-lyrics/ui/Resizable';
import { storage } from 'wxt/utils/storage';

import { POPUP } from './surfaces';

export const popupSizeStorage = storage.defineItem<{
    width: number;
    height: number;
}>('local:layout:popup-size', {
    fallback: {
        width: POPUP.width,
        height: POPUP.height,
    },
    version: 1,
});

function remembersWidth(mode: ResizeMode) {
    return mode === 'both' || mode === 'horizontal';
}

function remembersHeight(mode: ResizeMode) {
    return mode === 'both' || mode === 'vertical';
}

export async function savePopupSize(
    width: number | string,
    height: number | string,
    remember: ResizeMode
) {
    if (remember === false) return;

    const stored = await popupSizeStorage.getValue();

    await popupSizeStorage.setValue({
        width:
            remembersWidth(remember) && typeof width === 'number'
                ? width
                : stored.width,
        height:
            remembersHeight(remember) && typeof height === 'number'
                ? height
                : stored.height,
    });
}
