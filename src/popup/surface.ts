export type Surface = 'popup' | 'sidepanel';

export type SurfaceConfig = {
    resizer: boolean;
};

export const SURFACE_CONFIG = {
    popup: { resizer: true },
    sidepanel: { resizer: false },
} satisfies Record<Surface, SurfaceConfig>;

export const getSurfaceConfig = (surface: Surface) => SURFACE_CONFIG[surface];
