import type { ReactNode } from 'react';

export type ImageShape = 'round' | 'square';

export const getAvatarRadius = (imageShape: ImageShape) =>
    imageShape === 'round' ? 'full' : 'small';

export const getAvatarFallback = (icon: ReactNode, title?: string) =>
    icon ?? title?.trim().charAt(0) ?? ' ';
