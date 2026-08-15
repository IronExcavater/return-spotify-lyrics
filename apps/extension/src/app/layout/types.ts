import type { Surface } from '@/app/surface/types';
import type { ResizeMode } from '@/ui/Resizable';

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
