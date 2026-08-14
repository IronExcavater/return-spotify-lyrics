import type { Surface } from '@/app/surface/types';
import type { Bounds, Resize, Size } from '@/shared/size';

export type Dimension = number | 'auto';
export type BarPolicy = 'preserve' | 'home' | 'playback' | 'hidden';

export type RouteLayout = {
    bar?: BarPolicy;
    popup?: {
        size?: Partial<Size<Dimension>>;
        bounds?: Partial<Bounds>;
        resize?: Partial<Resize>;
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
              size: Size<Dimension>;
              bounds: Bounds;
              resize: Resize;
              persist: Resize;
          }
        | {
              kind: 'browser';
          };
};
