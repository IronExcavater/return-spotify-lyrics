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
