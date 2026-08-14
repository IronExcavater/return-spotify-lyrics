import { storage } from 'wxt/utils/storage';

import type { Size } from '@/shared/size';

import { POPUP_DEFAULT_SIZE } from './surfaces';

export const popupSizeStorage = storage.defineItem<Size>(
    'local:layout:popup-size',
    {
        fallback: POPUP_DEFAULT_SIZE,
        version: 1,
    }
);
