import { storage } from 'wxt/utils/storage';

import { POPUP_DEFAULT_SIZE } from './surfaces';
import type { Size } from './types';

export const popupSizeStorage = storage.defineItem<Size<number>>(
    'local:layout:popup-size',
    {
        fallback: POPUP_DEFAULT_SIZE,
        version: 1,
    }
);
