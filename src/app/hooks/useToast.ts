import { useSyncExternalStore } from 'react';

import { readToastSnapshot, subscribeToToastStore } from '../data/toastStore';

export const useToasts = () =>
    useSyncExternalStore(
        subscribeToToastStore,
        readToastSnapshot,
        readToastSnapshot
    );
