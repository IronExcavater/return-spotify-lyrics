import type { MinMax, Size } from './types';

export const POPUP_DEFAULT_SIZE = {
    width: 400,
    height: 520,
} satisfies Size<number>;

export const POPUP_RANGE = {
    width: { min: 350, max: 520 },
    height: { min: 320, max: 700 },
} satisfies Size<MinMax<number>>;

export const POPUP_RESIZE = {
    width: true,
    height: true,
} satisfies Size<boolean>;
