import type { Bounds, Resize, Size } from '@/shared/size';

export const POPUP_DEFAULT_SIZE = {
    width: 400,
    height: 520,
} satisfies Size;

export const POPUP_BOUNDS = {
    width: { min: 350, max: 520 },
    height: { min: 320, max: 700 },
} satisfies Bounds;

export const POPUP_RESIZE = {
    width: true,
    height: true,
} satisfies Resize;
