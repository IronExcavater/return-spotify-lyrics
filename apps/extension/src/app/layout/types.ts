import type { ResizeMode } from '@return-spotify-lyrics/ui/Resizable';

import type { Surface } from '@/app/surface/types';

export type BarPolicy = 'preserve' | 'home' | 'playback' | 'hidden';

export type RouteLayout = {
    bar?: BarPolicy;
    popup?: {
        width?: number | 'auto';
        height?: number | 'auto';
        minWidth?: number;
        maxWidth?: number;
        minHeight?: number;
        maxHeight?: number;
        resize?: ResizeMode;
    };
};

export type AppRouteHandle = {
    layout?: RouteLayout;
};

export type AppLayout = {
    surface: Surface;
    bar: BarPolicy;
    viewport:
        | {
              kind: 'popup';
              width: number | 'auto';
              height: number | 'auto';
              minWidth: number;
              maxWidth: number;
              minHeight: number;
              maxHeight: number;
              resize: ResizeMode;
              remember: ResizeMode;
          }
        | {
              kind: 'browser';
          };
};
