import type { ReactNode } from 'react';

import type { MediaItem } from '../../shared/types';

export type MediaShelfItem = MediaItem & {
    icon?: ReactNode;
    loading?: boolean;
    listKey?: string;
};
