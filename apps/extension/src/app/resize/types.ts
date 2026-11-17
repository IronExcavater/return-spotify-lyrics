import type { Size } from '@return-spotify-lyrics/ui/geometry';

export type BarPolicy = 'hidden' | 'preserve';

export type AppRouteHandle = {
    layout: {
        bar: BarPolicy;
        popup?: Size;
    };
};
