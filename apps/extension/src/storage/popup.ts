import { storage } from 'wxt/utils/storage';

import type { Size } from '@return-spotify-lyrics/ui/geometry';

export const popupSizeItem = storage.defineItem<Size>('local:popupSize');
