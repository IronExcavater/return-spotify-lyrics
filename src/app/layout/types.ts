import type { MinMax, Size } from '@/shared/geometry';
import type { Surface } from '@/app/surface/types';

export type { MinMax, Size } from '@/shared/geometry';

export type Dimension = number | 'auto';
export type BarPolicy = 'preserve' | 'home' | 'playback' | 'hidden';

export type PopupRouteLayout = {
    size?: Partial<Size<Dimension>>;
    range?: Partial<Size<MinMax<number>>>;
    resize?: Partial<Size<boolean>>;
};

export type RouteLayout = {
    bar?: BarPolicy;
    popup?: PopupRouteLayout;
};

export type AppRouteHandle = {
    layout?: RouteLayout;
};

export type PopupViewportLayout = {
    kind: 'popup';
    size: Size<Dimension>;
    range: Size<MinMax<number>>;
    resize: Size<boolean>;
    persist: Size<boolean>;
};

export type BrowserViewportLayout = {
    kind: 'browser';
};

export type AppLayout = {
    surface: Surface;
    bar: BarPolicy;
    viewport: PopupViewportLayout | BrowserViewportLayout;
};
